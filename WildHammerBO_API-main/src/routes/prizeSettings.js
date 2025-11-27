const express = require('express');
const router = express.Router();
const PrizeSettingController = require('../controllers/prizeSetting.Controller');
const auth = require('../middlewares/auth');

// Protected routes (require authentication)
//router.use(auth.authenticateToken);

// Update all prize setting values where id=1
router.put('/update',auth.authenticateToken, PrizeSettingController.updateAllSettings);

// Increase total_buytoken
router.post('/increase-total-buytoken',auth.authenticateToken, PrizeSettingController.increaseTotalBuytoken);

// Bonus endpoints for testing/viewing (optional)
// Get prize setting by ID
router.get('/:id', PrizeSettingController.getPrizeSetting);

// Get all prize settings
router.get('/', PrizeSettingController.getAllPrizeSettings);

module.exports = router;
