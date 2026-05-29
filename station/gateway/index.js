const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const mqtt = require('mqtt');
const http = require('http');

const app = express();
app.use(cors());
app.use(/^\/(?!api\/)/, express.json());

const MQTT_BROKER = process.env.MQTT_BROKER || 'mosquitto';
const PORT = process.env.PORT || 8080;

const PATIENT_SERVICE = process.env.PATIENT_SERVICE || 'http://patient-service:3001';
const SESSION_SERVICE = process.env.SESSION_SERVICE || 'http://session-service:3002';
const SENSOR_SERVICE = process.env.SENSOR_SERVICE || 'http://sensor-service:3004';
const LLM_SERVICE = process.env.LLM_SERVICE || 'http://llm-service:3005';
const WATCHDOG_SERVICE = process.env.WATCHDOG_SERVICE || 'http://watchdog-service:3006';
const CLOUD_API_URL = process.env.CLOUD_API_URL || '';

let simulationMode = false;
const cloudVitalsThrottle = {};
let simulationDataset = 'green';

const mqttClient = mqtt.connect(`mqtt://${MQTT_BROKER}:1883`);

mqttClient.on('connect', () => {
    console.log('Gateway connected to MQTT broker');
    mqttClient.subscribe('primecare/#');
});

mqttClient.on('error', (err) => {
    console.error('MQTT error:', err.message);
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });
const wsClients = new Set();

wss.on('connection', (ws, req) => {
    wsClients.add(ws);
    console.log(`WebSocket client connected. Total: ${wsClients.size}`);
    ws.send(JSON.stringify({
        type: 'simulation_status',
        simulation_mode: simulationMode,
        dataset: simulationDataset
    }));

    ws.on('message', (raw) => {
        try {
            const msg = JSON.parse(raw.toString());
            if (msg.type === 'diagnosis_answer' && msg.session_id && msg.answer) {
                mqttClient.publish('primecare/diagnosis/answer', JSON.stringify({
                    session_id: msg.session_id,
                    answer: msg.answer
                }));
            }
        } catch (e) {}
    });

    ws.on('close', () => wsClients.delete(ws));
    ws.on('error', () => wsClients.delete(ws));
});

function broadcast(data) {
    const msg = JSON.stringify(data);
    for (const ws of wsClients) {
        if (ws.readyState === 1) ws.send(msg);
    }
}

mqttClient.on('message', (topic, payload) => {
    try {
        const data = JSON.parse(payload.toString());

        // Relay all MQTT messages to WebSocket clients
        broadcast({ type: 'mqtt', topic, data });

        if (topic === 'primecare/diagnosis/result') {
            broadcast({ type: 'diagnosis_result', data });
            if (data.session_id && !data.simulation) {
                setTimeout(() => {
                    fetch(`http://printer-service:8004/print/${data.session_id}`, { method: 'POST' })
                        .catch(e => console.log(`[Gateway] Print failed: ${e.message}`));
                }, 2000);
            }
        }

        if (topic === 'primecare/diagnosis/question') {
            broadcast({ type: 'diagnosis_question', ...data });
        }

        if (topic === 'primecare/system/connectivity') {
            broadcast({ type: 'connectivity_change', mode: data.mode });
        }

        // Band vitals relay to WebSocket clients for live dashboard
        if (topic.startsWith('primecare/band/') && topic.endsWith('/vitals')) {
            const parts = topic.split('/');
            const patientId = parts[2];
            broadcast({ type: 'band_vitals', patient_id: patientId, data });

            // Relay to cloud — throttled to 1 per 60s, only real readings
            if (CLOUD_API_URL && (data.hr > 0 || data.sp > 0)) {
                const now = Date.now();
                if (!cloudVitalsThrottle[patientId] || now - cloudVitalsThrottle[patientId] > 60000) {
                    cloudVitalsThrottle[patientId] = now;
                    fetch(`${CLOUD_API_URL}/api/inbound/band/vitals`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ patient_id: patientId, ...data })
                    }).catch(e => console.log(`[Gateway] Cloud band relay failed: ${e.message}`));
                }
            }
        }

        // Fall events relay to cloud
        if (topic.startsWith('primecare/band/') && topic.endsWith('/fall')) {
            const parts = topic.split('/');
            const patientId = parts[2];
            if (CLOUD_API_URL) {
                fetch(`${CLOUD_API_URL}/api/inbound/alerts`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ patient_id: patientId, type: 'fall', severity: 'CRITICAL', ...data })
                }).catch(e => console.log(`[Gateway] Cloud fall relay failed: ${e.message}`));
            }
        }

        // Watchdog alerts relay to cloud
        if (topic === 'primecare/alerts/watchdog') {
            if (CLOUD_API_URL) {
                fetch(`${CLOUD_API_URL}/api/inbound/alerts`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                }).catch(e => console.log(`[Gateway] Cloud watchdog relay failed: ${e.message}`));
            }
        }

    } catch (err) {}
});

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'primecare-gateway',
        version: '1.0',
        ws_clients: wsClients.size,
        simulation_mode: simulationMode,
        simulation_dataset: simulationDataset
    });
});

app.get('/admin', (req, res) => {
    res.send(`<!DOCTYPE html>
<html>
<head><title>PrimeCare Admin</title>
<style>
  body { font-family: Inter, sans-serif; background: #0A0A0F; color: #F8FAFC; padding: 32px; }
  h1 { color: #6366F1; } button { padding: 10px 20px; margin: 8px; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; }
  .green { background: #22C55E; color: #000; } .yellow { background: #F59E0B; color: #000; } .red { background: #EF4444; color: #fff; } .off { background: #374151; color: #fff; }
  #status { margin-top: 24px; padding: 16px; background: #1E1E2E; border-radius: 8px; font-family: monospace; }
</style></head>
<body>
<h1>PrimeCare Admin</h1>
<h3>Simulation Mode</h3>
<button class="green" onclick="setSim('green')">GREEN — Normal</button>
<button class="yellow" onclick="setSim('yellow')">YELLOW — Attention</button>
<button class="red" onclick="setSim('red')">RED — Critical</button>
<button class="off" onclick="disableSim()">OFF — Real Sensors</button>
<div id="status">Loading...</div>
<script>
  async function setSim(d) { await fetch('/admin/simulation/enable/'+d, {method:'POST'}); loadStatus(); }
  async function disableSim() { await fetch('/admin/simulation/disable', {method:'POST'}); loadStatus(); }
  async function loadStatus() {
    const r = await fetch('/health'); const d = await r.json();
    document.getElementById('status').innerHTML = JSON.stringify(d, null, 2);
  }
  loadStatus(); setInterval(loadStatus, 5000);
</script>
</body></html>`);
});

app.post('/admin/simulation/enable/:dataset', (req, res) => {
    const { dataset } = req.params;
    if (!['green', 'yellow', 'red'].includes(dataset)) return res.status(400).json({ error: 'Invalid dataset' });
    simulationMode = true;
    simulationDataset = dataset;
    mqttClient.publish('primecare/simulation/mode', JSON.stringify({ enabled: true, dataset }));
    broadcast({ type: 'simulation_changed', simulation_mode: true, dataset });
    res.json({ success: true, simulation_mode: true, dataset });
});

app.post('/admin/simulation/disable', (req, res) => {
    simulationMode = false;
    simulationDataset = 'green';
    mqttClient.publish('primecare/simulation/mode', JSON.stringify({ enabled: false }));
    broadcast({ type: 'simulation_changed', simulation_mode: false });
    res.json({ success: true, simulation_mode: false });
});

// API proxy routes
app.use('/api/patients', createProxyMiddleware({ target: PATIENT_SERVICE, changeOrigin: true, pathRewrite: { '^/api/patients': '/patients' } }));

app.post('/api/sessions/start', express.json(), async (req, res) => {
    const body = { ...req.body, simulation_mode: simulationMode, simulation_dataset: simulationDataset };
    try {
        const response = await fetch(`${SESSION_SERVICE}/sessions/start`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        res.json(await response.json());
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.use('/api/sessions', createProxyMiddleware({ target: SESSION_SERVICE, changeOrigin: true, pathRewrite: { '^/api/sessions': '/sessions' } }));
app.use('/api/sensors', createProxyMiddleware({ target: SENSOR_SERVICE, changeOrigin: true, pathRewrite: { '^/api/sensors': '/sensors' } }));
app.use('/api/llm', createProxyMiddleware({ target: LLM_SERVICE, changeOrigin: true, pathRewrite: { '^/api/llm': '' } }));
app.use('/api/watchdog', createProxyMiddleware({ target: WATCHDOG_SERVICE, changeOrigin: true, pathRewrite: { '^/api/watchdog': '' } }));
app.use('/api/eye', createProxyMiddleware({ target: 'http://eye-service:8001', changeOrigin: true, pathRewrite: { '^/api/eye': '' } }));
app.use('/api/printer', createProxyMiddleware({ target: 'http://printer-service:8004', changeOrigin: true, pathRewrite: { '^/api/printer': '' } }));

app.post('/api/diagnosis/start', express.json(), async (req, res) => {
    const { session_id } = req.body;
    try {
        await fetch(`${SESSION_SERVICE}/sessions/${session_id}/complete`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// WebSocket control channel for kiosk/controller
const controllerClients = new Set();
const kioskClients = new Set();
const controlWss = new WebSocketServer({ server, path: '/control' });
controlWss.on('connection', (ws, req) => {
    const role = new URL(req.url, 'http://localhost').searchParams.get('role') || 'kiosk';
    if (role === 'controller') { controllerClients.add(ws); ws.send(JSON.stringify({ type: 'connected', role: 'controller' })); }
    else { kioskClients.add(ws); ws.send(JSON.stringify({ type: 'connected', role: 'kiosk' })); }
    ws.on('message', (data) => {
        try {
            const msg = JSON.parse(data.toString());
            if (role === 'controller') for (const k of kioskClients) if (k.readyState === 1) k.send(JSON.stringify(msg));
        } catch (e) {}
    });
    ws.on('close', () => { controllerClients.delete(ws); kioskClients.delete(ws); });
});

app.get('/api/controller/status', (req, res) => res.json({ controllers: controllerClients.size, kiosks: kioskClients.size }));

server.listen(PORT, '0.0.0.0', () => {
    console.log(`PrimeCare Gateway running on port ${PORT}`);
});
