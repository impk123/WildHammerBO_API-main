const express = require('express');
const router = express.Router();
const RewardController = require('../controllers/reward.Controller');
const { authenticateToken } = require('../middlewares/auth');

// Public routes (no authentication required)
router.get('/active', RewardController.getActiveRewards);
router.get('/:id', RewardController.getRewardById);

// Protected routes (require authentication)
//router.use(authenticateToken);

// Admin routes for managing rewards
router.get('/', RewardController.getAllRewards);
router.post('/', RewardController.createReward);
router.put('/:id', RewardController.updateReward);
router.delete('/:id', RewardController.deleteReward);

// Redemption routes
router.post('/redeem', RewardController.redeemReward);
router.get('/redemptions/user', RewardController.getUserRedemptions);
router.get('/redemptions/all', RewardController.getAllRedemptions);
router.put('/redemptions/:id/status', RewardController.updateRedemptionStatus);
router.get('/redemptions/statistics', RewardController.getRedemptionStatistics);

module.exports = router;
