const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const GamePacketController = require('../controllers/gamePacket.Controller');
const { authenticateToken, requireRole, requirePermission } = require('../middlewares/auth');

// Input validation middleware
const validateCreatePacket = [
    body('name')
        .notEmpty()
        .withMessage('Packet name is required')
        .isLength({ min: 3, max: 100 })
        .withMessage('Packet name must be between 3 and 100 characters'),
    body('packet_type')
        .isIn(['starter', 'equipment', 'weapon', 'special', 'premium'])
        .withMessage('Invalid packet type'),
    body('price_token')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Price in tokens must be a non-negative integer'),
    body('game_items')
        .optional()
        .isJSON()
        .withMessage('Game items must be valid JSON'),
    body('equipment_items')
        .optional()
        .isJSON()
        .withMessage('Equipment items must be valid JSON'),
    body('level_requirement')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Level requirement must be at least 1'),
    body('is_featured')
        .optional()
        .isBoolean()
        .withMessage('is_featured must be a boolean'),
];

const validateUpdatePacket = [
    param('id')
        .isInt({ min: 1 })
        .withMessage('Invalid packet ID'),
    body('name')
        .optional()
        .isLength({ min: 3, max: 100 })
        .withMessage('Packet name must be between 3 and 100 characters'),
    body('packet_type')
        .optional()
        .isIn(['starter', 'equipment', 'weapon', 'special', 'premium'])
        .withMessage('Invalid packet type'),
    body('price_token')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Price in tokens must be a non-negative integer'),
    body('game_items')
        .optional()
        .isJSON()
        .withMessage('Game items must be valid JSON'),
    body('equipment_items')
        .optional()
        .isJSON()
        .withMessage('Equipment items must be valid JSON'),
    body('level_requirement')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Level requirement must be at least 1'),
];

// validateAddItem is no longer needed as items are managed through JSON fields

const validatePurchase = [
    param('id')
        .isInt({ min: 1 })
        .withMessage('Invalid packet ID'),
    body('payment_type')
        .optional()
        .isIn(['token'])
        .withMessage('Payment type must be token'),
    body('user_id')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Invalid user ID')
];

// Public routes (no authentication required)

// Admin only routes

/**
 * Create new packet (Admin only)
 * POST /api/admin/packets
 */
router.post('/admin',
    authenticateToken,
    // requireRole(['admin', 'super_admin']),
    validateCreatePacket,
    GamePacketController.createPacket
);

/**
 * Update packet (Admin only)
 * PUT /api/admin/packets/:id
 */
router.put('/admin/:id',
    authenticateToken,
    // requireRole(['admin', 'super_admin']),
    validateUpdatePacket,
    GamePacketController.updatePacket
);

/**
 * Delete packet (Admin only)
 * DELETE /api/admin/packets/:id
 */
router.delete('/admin/:id',
    authenticateToken,
    // requireRole(['admin', 'super_admin']),
    GamePacketController.deletePacket
);

// Note: Item management is now done through JSON fields in packet creation/update

/**
 * Get packet statistics (Admin only)
 * GET /api/admin/packets/statistics
 */
router.get('/admin/statistics',
    authenticateToken,
    // requireRole(['admin', 'super_admin']),
    GamePacketController.getPacketStatistics
);

/**
 * Get all packets including inactive ones (Admin only)
 * GET /api/admin/packets
 */
router.get('/admin',
    authenticateToken,
    // requireRole(['admin', 'super_admin']),
    GamePacketController.getAllPackets
);


/**
 * Get all active packets
 * GET /api/gamepackets/
 */
router.get('/', GamePacketController.getAllPackets);

/**
 * GET /api/gamepackets/:id
 */
router.get('/:id', GamePacketController.getPacketById);


/**
 * POST /api/gamepackets/purchase
 */
router.post('/purchase/:id', GamePacketController.purchasePacket);

// Get packet purchase history
router.get('/purchase/history', GamePacketController.getUserPurchaseHistory);

module.exports = router;