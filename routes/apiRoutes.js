const express = require('express');
const router = express.Router();
const matchmakingService = require('../services/matchmakingService');

router.get('/queue', (req, res) => {
    res.status(200).json({ queue: matchmakingService.getQueue() });
});

module.exports = router;
