const express = require('express');
const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const mqtt = require('mqtt');
const http = require('http');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const DB_PATH = process.env.DB_PATH || '/data/primecare.db';
const MQTT_BROKER = process.env.MQTT_BROKER || 'mosquitto';
const LLM_SERVICE_URL = process.env.LLM_SERVICE_URL || 'http://llm-service:3005';
const PATIENT_SERVICE_URL = process.env.PATIENT_SERVICE_URL || 'http://patient-service:3001';
const PORT = process.env.PORT || 3002;

const sessions = {};

function getDb() {
    return new Database(DB_PATH);
}

// ── MQTT ──────────────────────────────────────────────────────────────────────

const mqttClient = mqtt.connect(`mqtt://${MQTT_BROKER}:1883`);

mqttClient.on('connect', () => {
    console.log('Session service connected to MQTT broker');
});

mqttClient.on('error', (err) => {
    console.error('MQTT error:', err.message);
});

// ── WebSocket ─────────────────────────────────────────────────────────────────

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });
const wsClients = new Map();

wss.on('connection', (ws, req) => {
    const sessionId = new URL(req.url, 'http://localhost').searchParams.get('session_id');
    if (sessionId) {
        wsClients.set(sessionId, ws);
        console.log(`WebSocket client connected for session: ${sessionId}`);
    }
    ws.on('close', () => {
        for (const [id, client] of wsClients.entries()) {
            if (client === ws) { wsClients.delete(id); break; }
        }
    });
});

function sendToSession(sessionId, data) {
    const ws = wsClients.get(sessionId);
    if (ws && ws.readyState === 1) {
        ws.send(JSON.stringify(data));
    }
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────

async function httpPost(url, body) {
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(60000)
    });
    return res.json();
}

async function httpGet(url) {
    const res = await fetch(url, {
        signal: AbortSignal.timeout(10000)
    });
    return res.json();
}

// ── Session complete flow ─────────────────────────────────────────────────────

async function completeSession(sessionId) {
    const session = sessions[sessionId];
    if (!session) return;

    console.log(`[Session] Completing session ${sessionId}`);

    // Build readings object from session readings array
    const readings = {};
    for (const r of session.readings) {
        if (r.value && typeof r.value === 'object') {
            readings[r.sensor_type] = r.value;
        } else if (r.value !== undefined) {
            readings[r.sensor_type] = r.value;
        }
    }

    // Merge inline readings if present
    if (session.inlineReadings) {
        Object.assign(readings, session.inlineReadings);
    }

    // Fetch patient full profile
    let patient = session.patientData || {};
    try {
        const patientRes = await httpGet(`${PATIENT_SERVICE_URL}/patients/${session.patient_id}`);
        if (patientRes.success) {
            patient = patientRes.patient;
            session.history = patientRes.visits || [];
        }
    } catch (err) {
        console.error('[Session] Could not fetch patient profile:', err.message);
    }

    // Call LLM Mode 1 — silent session analysis
    let result = null;
    try {
        console.log('[Session] Calling LLM service for analysis...');
        console.log('[Session] Readings:', JSON.stringify(readings));
        console.log('[Session] Patient ID:', patient.id || patient);
        result = await httpPost(`${LLM_SERVICE_URL}/analysis/session`, {
            patient,
            readings,
            history: session.history || []
        });
        console.log(`[Session] LLM result: ${result.risk_level}`);
    } catch (err) {
        console.error('[Session] LLM call failed:', err.message);
        result = {
            risk_level: 'YELLOW',
            health_score: 60,
            summary: 'Analysis could not be completed. Please consult a doctor if you have concerns.',
            what_to_do: 'Monitor your health and schedule a follow-up checkup.',
            doctor_type: null,
            next_checkup_days: 7,
            fallback: true
        };
    }

    // Save result to DB
    const db = getDb();
    try {
        db.prepare(`
            UPDATE visits SET
                risk_level = ?,
                health_score = ?,
                ai_summary = ?,
                what_to_do = ?,
                doctor_type = ?,
                next_checkup_days = ?,
                completed_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(
            result.risk_level,
            result.health_score,
            result.summary,
            result.what_to_do,
            result.doctor_type || null,
            result.next_checkup_days,
            sessionId
        );

        // Save mood log if mood reading exists
        const moodScore = readings.mood_score || readings.mood || null;
        if (moodScore || readings.sleep_quality) {
            db.prepare(`
                INSERT INTO mood_logs (patient_id, score, sleep_quality)
                VALUES (?, ?, ?)
            `).run(
                session.patient_id,
                moodScore,
                readings.sleep_quality || null
            );
        }

        // Add to sync queue
        db.prepare(`INSERT OR IGNORE INTO sync_queue (visit_id) VALUES (?)`).run(sessionId);

        console.log(`[Session] Saved result to DB: ${result.risk_level}`);
    } catch (err) {
        console.error('[Session] DB save error:', err);
    } finally {
        db.close();
    }

    // Update session in memory
    session.status = 'completed';
    session.result = result;

    // Publish to MQTT
    mqttClient.publish(
        `primecare/station/${session.patient_id}/diagnosis`,
        JSON.stringify({
            session_id: sessionId,
            patient_id: session.patient_id,
            risk_level: result.risk_level,
            health_score: result.health_score,
            summary: result.summary,
            what_to_do: result.what_to_do,
            doctor_type: result.doctor_type,
            next_checkup_days: result.next_checkup_days,
            timestamp: Date.now()
        })
    );

    // Send to connected WebSocket client
    sendToSession(sessionId, {
        type: 'diagnosis_result',
        data: { session_id: sessionId, ...result }
    });

    // POST directly to cloud — immediate, no waiting for sync cycle
    const CLOUD_API_URL = process.env.CLOUD_API_URL || '';
    if (CLOUD_API_URL) {
        const visitPayload = {
            id: sessionId,
            patient_id: session.patient_id,
            session_type: session.session_type || 'daily',
            risk_level: result.risk_level,
            health_score: result.health_score,
            ai_summary: result.summary,
            what_to_do: result.what_to_do,
            doctor_type: result.doctor_type,
            next_checkup_days: result.next_checkup_days,
            completed_at: new Date().toISOString(),
            readings: session.readings || []
        };
        fetch(`${CLOUD_API_URL}/api/inbound/visits`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(visitPayload)
        }).then(() => console.log(`[Session] Visit posted to cloud`))
          .catch(e => console.log(`[Session] Cloud post failed: ${e.message}`));
    }

    console.log(`[Session] Session ${sessionId} complete — ${result.risk_level}`);
}

// ── Save session to DB helper ─────────────────────────────────────────────────

function saveReadingsToDb(sessionId) {
    const session = sessions[sessionId];
    if (!session) return;
    const db = getDb();
    try {
        for (const reading of session.readings) {
            db.prepare(`
                INSERT OR IGNORE INTO sensor_readings (visit_id, patient_id, sensor_type, value_json, quality_score)
                VALUES (?, ?, ?, ?, ?)
            `).run(
                sessionId,
                session.patient_id,
                reading.sensor_type,
                JSON.stringify(reading.value),
                reading.quality_score || 1.0
            );
        }
    } catch (err) {
        console.error('[Session] Save readings error:', err);
    } finally {
        db.close();
    }
}

// ── REST endpoints ────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'session-service', active_sessions: Object.keys(sessions).length });
});

// POST /sessions/start
app.post('/sessions/start', (req, res) => {
    const { patient_id, session_type } = req.body;

    if (!patient_id || !session_type) {
        return res.status(400).json({ error: 'patient_id and session_type required' });
    }

    const db = getDb();
    try {
        const patient = db.prepare('SELECT id FROM patients WHERE id = ?').get(patient_id);
        if (!patient) {
            return res.status(404).json({ error: 'Patient not found' });
        }
    } catch (err) {
        console.error('Patient lookup error:', err);
    } finally {
        db.close();
    }

    const session_id = uuidv4();
    sessions[session_id] = {
        id: session_id,
        patient_id,
        session_type,
        status: 'active',
        readings: [],
        history: [],
        result: null,
        started_at: new Date().toISOString()
    };

    const db2 = getDb();
    try {
        db2.prepare(`
            INSERT INTO visits (id, patient_id, session_type)
            VALUES (?, ?, ?)
        `).run(session_id, patient_id, session_type);
    } catch (err) {
        console.error('Create visit error:', err);
    } finally {
        db2.close();
    }

    mqttClient.publish('primecare/session/events', JSON.stringify({
        type: 'session_started',
        session_id,
        patient_id,
        session_type,
        timestamp: Date.now()
    }));

    res.status(201).json({ success: true, session_id, session: sessions[session_id] });
});

// POST /sessions/:id/reading
app.post('/sessions/:id/reading', (req, res) => {
    const { id } = req.params;
    // Accept both "value" and "value_json" field names
    const { sensor_type, value, value_json, quality_score } = req.body;
    const reading_value = value !== undefined ? value : value_json;

    if (!sessions[id]) {
        return res.status(404).json({ error: 'Session not found' });
    }
    sessions[id].readings.push({
        sensor_type,
        value: reading_value,
        quality_score: quality_score || 1.0
    });
    res.json({ success: true, readings_count: sessions[id].readings.length });
});

// POST /sessions/:id/complete
app.post('/sessions/:id/complete', async (req, res) => {
    const { id } = req.params;
    if (!sessions[id]) {
        return res.status(404).json({ error: 'Session not found' });
    }

    const { readings: bodyReadings } = req.body;
    if (bodyReadings && typeof bodyReadings === 'object') {
        sessions[id].inlineReadings = bodyReadings;
    }

    sessions[id].status = 'analyzing';

    // Save readings to DB immediately
    saveReadingsToDb(id);

    // Respond immediately, run analysis in background
    res.json({ success: true, status: 'analyzing', session_id: id });

    completeSession(id).catch(err => {
        console.error('[Session] completeSession error:', err);
    });
});

// GET /sessions/:id
app.get('/sessions/:id', (req, res) => {
    const { id } = req.params;
    if (!sessions[id]) {
        const db = getDb();
        try {
            const visit = db.prepare('SELECT * FROM visits WHERE id = ?').get(id);
            if (visit) {
                return res.json({ success: true, session: visit });
            }
        } catch (err) {
            console.error('Get session DB error:', err);
        } finally {
            db.close();
        }
        return res.status(404).json({ error: 'Session not found' });
    }
    res.json({ success: true, session: sessions[id] });
});

// GET /sessions/patient/:patientId
app.get('/sessions/patient/:patientId', (req, res) => {
    const { patientId } = req.params;
    const db = getDb();
    try {
        const visits = db.prepare(`
            SELECT * FROM visits WHERE patient_id = ? ORDER BY started_at DESC
        `).all(patientId);
        res.json({ success: true, visits });
    } catch (err) {
        console.error('Get patient sessions error:', err);
        res.status(500).json({ error: err.message });
    } finally {
        db.close();
    }
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`PrimeCare session service running on port ${PORT}`);
});
