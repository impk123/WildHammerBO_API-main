const express = require('express');
const router = express.Router();
const PrizeByRankController = require('../controllers/prizeByRank.Controller');
const auth = require('../middlewares/auth');

// Public routes (no authentication required)
// Get all prize by rank records
router.get('/', PrizeByRankController.getAllPrizeByRank);

// Get prize by rank by ID
router.get('/:id', PrizeByRankController.getPrizeByRankById);

// Get prize percentage for a specific rank
router.get('/rank/:rank', PrizeByRankController.getPrizeForRank);

// Get statistics
router.get('/stats/overview', PrizeByRankController.getStatistics);

// Check for rank range overlaps
router.get('/stats/overlaps', PrizeByRankController.checkOverlaps);

// Get summary of prize by rank with prize setting data
router.get('/summary', PrizeByRankController.getSummaryPrizeByRank);

// Protected routes (require authentication)
// Create new prize by rank record
router.post('/', auth.authenticateToken, PrizeByRankController.createPrizeByRank);

// Update prize by rank record
router.put('/:id', auth.authenticateToken, PrizeByRankController.updatePrizeByRank);

// Delete prize by rank record
router.delete('/:id', auth.authenticateToken, PrizeByRankController.deletePrizeByRank);

// Bulk create prize by rank records
router.post('/bulk', auth.authenticateToken, PrizeByRankController.bulkCreatePrizeByRank);

module.exports = router;
