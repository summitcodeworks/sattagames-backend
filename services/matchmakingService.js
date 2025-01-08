const Player = require('../models/Player');

const playersQueue = [];
const playerTimeouts = {}; // Store timeout references for each player
const playerRetries = {}; // Track player retry counts
const playerCooldowns = {}; // Track cooldowns

const MATCH_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 3; // Maximum retry attempts for the same bet amount
const COOLDOWN_PERIOD = 60000; // 60 seconds cooldown period

/**
 * Add a player to the matchmaking queue.
 */
function addPlayer(playerId, betAmount, ws) {
    // Check if player is in cooldown
    if (playerCooldowns[playerId]) {
        ws.send(JSON.stringify({
            event: 'cooldown',
            message: `You are in cooldown. Please wait ${COOLDOWN_PERIOD / 1000} seconds or change your bet amount.`,
            retries: playerRetries[playerId]?.count || 0
        }));
        console.log(`⏳ Player ${playerId} is in cooldown.`);
        return;
    }

    // Check if player already exists in the queue
    const existingPlayer = playersQueue.find(player => player.playerId === playerId);

    if (existingPlayer) {
        // Update existing player's bet amount and WebSocket connection
        existingPlayer.betAmount = betAmount;
        existingPlayer.ws = ws;
        console.log(`🔄 Player ${playerId} updated with new bet ${betAmount}`);

        // Reset timeout and retries for the updated player
        clearTimeout(playerTimeouts[playerId]);
        setPlayerTimeout(playerId, ws);
        resetRetryCount(playerId);

        // Notify the player about retries
        ws.send(JSON.stringify({
            event: 'queue_update',
            message: `You have been re-added to the queue.`,
            retries: playerRetries[playerId]?.count || 0
        }));
    } else {
        // Add new player to the queue
        const player = new Player(playerId, betAmount, ws);
        playersQueue.push(player);
        console.log(`✅ Player ${playerId} added with bet ${betAmount}`);

        // Start timeout for the new player
        setPlayerTimeout(playerId, ws);
        resetRetryCount(playerId);

        // Notify the player about retries
        ws.send(JSON.stringify({
            event: 'queue_joined',
            message: `You have joined the queue.`,
            retries: playerRetries[playerId]?.count || 0
        }));
    }
}

function matchPlayers() {
    const betGroups = {};

    playersQueue.forEach(player => {
        if (!betGroups[player.betAmount]) {
            betGroups[player.betAmount] = [];
        }
        betGroups[player.betAmount].push(player);
    });

    for (const betAmount in betGroups) {
        while (betGroups[betAmount].length >= 2) {
            const player1 = betGroups[betAmount].shift();
            const player2 = betGroups[betAmount].shift();

            player1.ws.send(JSON.stringify({
                event: 'match_found',
                opponent: player2.playerId,
                betAmount: betAmount
            }));
            player2.ws.send(JSON.stringify({
                event: 'match_found',
                opponent: player1.playerId,
                betAmount: betAmount
            }));

            console.log(`🎯 Match found: ${player1.playerId} vs ${player2.playerId}`);
            clearTimeout(playerTimeouts[player1.playerId]);
            clearTimeout(playerTimeouts[player2.playerId]);
            resetRetryCount(player1.playerId);
            resetRetryCount(player2.playerId);
            removePlayer(player1.playerId);
            removePlayer(player2.playerId);
        }
    }

    // Increment retry count for unmatched players
    playersQueue.forEach(player => {
        incrementRetryCount(player.playerId, player.ws, player.betAmount);
    });
}

/**
 * Increment retry count and apply cooldown if necessary.
 */
function incrementRetryCount(playerId, ws, betAmount) {
    if (!playerRetries[playerId]) {
        playerRetries[playerId] = { count: 0, betAmount };
    }

    if (playerRetries[playerId].betAmount === betAmount) {
        playerRetries[playerId].count += 1;
    } else {
        resetRetryCount(playerId); // Reset if bet amount changed
    }

    ws.send(JSON.stringify({
        event: 'retry_update',
        message: `Retry attempt ${playerRetries[playerId].count} out of ${MAX_RETRIES}.`,
        retries: playerRetries[playerId].count
    }));

    if (playerRetries[playerId].count >= MAX_RETRIES) {
        console.log(`🚫 Player ${playerId} reached max retries. Applying cooldown.`);
        removePlayer(playerId);
        applyCooldown(playerId, ws);
    }
}

/**
 * Set timeout for a player in the queue.
 */
function setPlayerTimeout(playerId, ws) {
    playerTimeouts[playerId] = setTimeout(() => {
        console.log(`⏳ Player ${playerId} timed out`);
        removePlayer(playerId);
        ws.send(JSON.stringify({
            event: 'match_timeout',
            message: 'You have been removed from the queue due to inactivity.'
        }));
    }, MATCH_TIMEOUT);
}

/**
 * Apply cooldown to a player.
 */
function applyCooldown(playerId, ws) {
    playerCooldowns[playerId] = setTimeout(() => {
        console.log(`✅ Player ${playerId} cooldown expired`);
        delete playerCooldowns[playerId];
    }, COOLDOWN_PERIOD);

    ws.send(JSON.stringify({
        event: 'cooldown',
        message: `You have reached the maximum retries. Please wait ${COOLDOWN_PERIOD / 1000} seconds or change your bet amount.`,
        retries: playerRetries[playerId]?.count || 0
    }));
}

/**
 * Remove a player from the matchmaking queue.
 */
function removePlayer(playerId) {
    const index = playersQueue.findIndex(player => player.playerId === playerId);
    if (index !== -1) {
        playersQueue.splice(index, 1);
        console.log(`❌ Player ${playerId} removed from queue`);
    }

    // Clear timeout
    if (playerTimeouts[playerId]) {
        clearTimeout(playerTimeouts[playerId]);
        delete playerTimeouts[playerId];
    }
}

/**
 * Reset retry count for a player.
 */
function resetRetryCount(playerId) {
    if (playerRetries[playerId]) {
        playerRetries[playerId].count = 0;
    }
}


/**
 * Get current queue.
 */
function getQueue() {
    return playersQueue.map(player => ({ playerId: player.playerId, betAmount: player.betAmount }));
}

module.exports = {
    addPlayer,
    matchPlayers,
    removePlayer,
    getQueue,
};
