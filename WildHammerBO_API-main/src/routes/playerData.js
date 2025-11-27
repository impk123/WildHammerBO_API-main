const express = require('express');
const router = express.Router();
const PlayerDataController = require('../controllers/playerData.Controller');
const auth = require('../middlewares/auth');

// Protected routes (require authentication)
// Add price token to player's recharge info
router.post('/add-price-token', auth.authenticateToken, PlayerDataController.addPriceToken);

// Update player recharge info (full update)
router.put('/:serverid/:roleid/recharge-info', auth.authenticateToken, PlayerDataController.updatePlayerRechargeInfo);

// Public routes (no authentication required)
// Get player recharge info
router.get('/:serverid/:roleid/recharge-info', PlayerDataController.getPlayerRechargeInfo);

// Check if player exists
router.get('/:serverid/:roleid/exists', PlayerDataController.checkPlayerExists);

// Get player data (full data)
router.get('/:serverid/:roleid', PlayerDataController.getPlayerData);

module.exports = router;
