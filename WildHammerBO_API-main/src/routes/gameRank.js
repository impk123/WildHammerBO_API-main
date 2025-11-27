const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole, requirePermission } = require('../middlewares/auth');

const gameRankController = require('../controllers/gameRank.Controller');

//router.use(authenticateToken);

// Get game Arena rank all 
router.get('/arena', gameRankController.getGameArenaRankAll);
// Get game lvl rank all
router.get('/level', gameRankController.getGameLvlRankAll);

module.exports = router;