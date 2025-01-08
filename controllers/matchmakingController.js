const matchmakingService = require('../services/matchmakingService');

function handleWebSocketConnection(ws) {
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            switch (data.event) {
                case 'join_queue':
                    if (!data.playerId || !data.betAmount) {
                        ws.send(JSON.stringify({ event: 'error', message: 'playerId and betAmount are required' }));
                        return;
                    }
                    matchmakingService.addPlayer(data.playerId, data.betAmount, ws);
                    matchmakingService.matchPlayers();
                    break;

                case 'leave_queue':
                    if (!data.playerId) {
                        ws.send(JSON.stringify({ event: 'error', message: 'playerId is required to leave queue' }));
                        return;
                    }
                    matchmakingService.removePlayer(data.playerId);
                    ws.send(JSON.stringify({ event: 'left_queue', message: 'Removed from queue' }));
                    break;

                default:
                    ws.send(JSON.stringify({ event: 'error', message: 'Unknown event' }));
            }
        } catch (error) {
            console.error('❗ Error processing message:', error);
            ws.send(JSON.stringify({ event: 'error', message: 'Invalid message format' }));
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });
}

module.exports = {
    handleWebSocketConnection,
};
