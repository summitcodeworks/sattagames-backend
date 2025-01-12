const pool = require('../config/db');

// Add player to the queue
async function addPlayerToQueue(playerId, betAmount) {
    await pool.query(
        `INSERT INTO sg_players_queue (player_id, bet_amount, retries, cooldown_until)
         VALUES ($1, $2, 0, NULL)
             ON CONFLICT (player_id)
         DO UPDATE SET bet_amount = $2, retries = 0, cooldown_until = NULL`,
        [playerId, betAmount]
    );

    await pool.query(
        `INSERT INTO sg_players_queue (player_id)
         VALUES ($1)`,
        [playerId]
    );
}

// Check if player is on cooldown
async function getPlayerCooldown(playerId) {
    const result = await pool.query(
        `SELECT retries, cooldown_until
         FROM sg_players_queue
         WHERE player_id = $1`,
        [playerId]
    );
    return result.rows[0];
}

// Get matchmaking queue
async function getMatchmakingQueue() {
    const result = await pool.query(`
        SELECT q.player_id, p.bet_amount
        FROM sg_players_queue q
                 JOIN sg_players p ON q.player_id = p.player_id
        ORDER BY q.created_at
    `);
    return result.rows;
}

// Remove players from the queue
async function removePlayersFromQueue(playerIds) {
    await pool.query(
        `DELETE FROM sg_players_queue
         WHERE player_id = ANY($1::text[])`,
        [playerIds]
    );
}

// Increment retry count or set cooldown
async function updateRetriesOrCooldown(playerId, retries, cooldownUntil = null) {
    await pool.query(
        `UPDATE sg_players_queue
         SET retries = $1, cooldown_until = $2
         WHERE player_id = $3`,
        [retries, cooldownUntil, playerId]
    );
}

module.exports = {
    addPlayerToQueue,
    getPlayerCooldown,
    getMatchmakingQueue,
    removePlayersFromQueue,
    updateRetriesOrCooldown
};
