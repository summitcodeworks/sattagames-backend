const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const matchmakingController = require('../controllers/matchmakingController');
const apiRoutes = require('../routes/apiRoutes');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = 3000;

// Middleware
app.use(express.json());
app.use('/api', apiRoutes);

// WebSocket Connection
wss.on('connection', (ws) => {
    console.log('New client connected');
    matchmakingController.handleWebSocketConnection(ws);
});

// Start the server
server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
