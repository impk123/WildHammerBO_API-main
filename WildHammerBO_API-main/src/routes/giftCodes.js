const express = require('express');
const router = express.Router();
const GiftCodeController = require('../controllers/giftCode.Controller');
const { authenticateToken, requireRole, requirePermission } = require('../middlewares/auth');

// Public routes (no authentication required)

// Validate gift code (can be used by both users and admins)
router.get('/validate/:code', GiftCodeController.validateGiftCode);

// User routes (require authentication)

// Redeem gift code
router.post('/redeem', authenticateToken, GiftCodeController.redeemGiftCode);

// Admin routes (require admin privileges)

// Create new gift code
router.post('/create', 
    authenticateToken, 
    requirePermission('gift_codes'), 
    GiftCodeController.createGiftCode
);

// Get all gift codes with pagination and filters
router.get('/', 
    authenticateToken, 
    requirePermission('gift_codes'), 
    GiftCodeController.getGiftCodes
);

// Get gift code statistics
router.get('/statistics', 
    authenticateToken, 
    requirePermission('gift_codes'), 
    GiftCodeController.getStatistics
);

// Generate code preview
router.get('/generate-preview', 
    authenticateToken, 
    requirePermission('gift_codes'), 
    GiftCodeController.generateCodePreview
);

// Get specific gift code by ID
router.get('/:id', 
    authenticateToken, 
    requirePermission('gift_codes'), 
    GiftCodeController.getGiftCodeById
);

// Deactivate gift code
router.patch('/:id/deactivate', 
    authenticateToken, 
    requirePermission('gift_codes'), 
    GiftCodeController.deactivateGiftCode
);

// Activate gift code
router.patch('/:id/activate', 
    authenticateToken, 
    requirePermission('gift_codes'), 
    GiftCodeController.activateGiftCode
);

// Super admin only routes

// Delete gift code (not implemented for safety - use deactivate instead)
// router.delete('/:id', 
//     authenticateToken, 
//     requireRole('super_admin'), 
//     GiftCodeController.deleteGiftCode
// );

module.exports = router;
