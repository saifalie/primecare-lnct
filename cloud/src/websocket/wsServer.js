const WebSocket = require('ws');

// Map of patientId -> Set of connected WebSocket clients
const patientClients = new Map();

const initWebSocket = (server) => {
  const wss = new WebSocket.Server({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url, 'http://localhost');
    const patientId = url.searchParams.get('patientId');

    if (!patientId) {
      ws.close(1008, 'patientId required');
      return;
    }

    // Register client for this patient
    if (!patientClients.has(patientId)) {
      patientClients.set(patientId, new Set());
    }
    patientClients.get(patientId).add(ws);
    console.log(`WebSocket client connected for patient: ${patientId}`);

    ws.on('close', () => {
      const clients = patientClients.get(patientId);
      if (clients) {
        clients.delete(ws);
        if (clients.size === 0) patientClients.delete(patientId);
      }
      console.log(`WebSocket client disconnected for patient: ${patientId}`);
    });

    ws.on('error', (err) => {
      console.error(`WebSocket error for patient ${patientId}:`, err.message);
    });

    // Send welcome message
    ws.send(JSON.stringify({ type: 'connected', patient_id: patientId }));
  });

  console.log('WebSocket server initialized at /ws');
};

const broadcastToPatient = (patientId, data) => {
  const clients = patientClients.get(patientId);
  if (!clients || clients.size === 0) return;

  const message = JSON.stringify(data);
  clients.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  });
};

module.exports = { initWebSocket, broadcastToPatient };
