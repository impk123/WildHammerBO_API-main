const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
    getAllPackets,
    getPacketById,
    createPacket,
    updatePacket,
    deletePacket,
    getActivePackets,
    getStatistics,
    testWeightedRandom,
    toggleActiveStatus,
    toggleEquipmentStatus,
    buyGachaPacket,
    getGachaHistory,
} = require('../controllers/gachaPacket.Controller');
const { authenticateToken, requireRole } = require('../middlewares/auth');

// Validation rules
const packetValidation = [
    body('name')
        .notEmpty()
        .withMessage('Name is required')
        .isLength({ min: 1, max: 100 })
        .withMessage('Name must be between 1 and 100 characters'),
    body('is_active')
        .optional()
        .isBoolean()
        .withMessage('is_active must be a boolean'),
    body('is_equipment')
        .optional()
        .isBoolean()
        .withMessage('is_equipment must be a boolean'),
    body('item')
        .notEmpty()
        .withMessage('Item is required')
        .custom((value) => {
            try {
                let itemObj;
                if (typeof value === 'string') {
                    itemObj = JSON.parse(value);
                } else if (typeof value === 'object') {
                    itemObj = value;
                } else {
                    throw new Error('Item must be valid JSON object');
                }

                // Validate required fields in item
                if (!itemObj.items || !Array.isArray(itemObj.items)) {
                    throw new Error('Item must contain items array');
                }

                // Validate each item in the array
                itemObj.items.forEach((item, index) => {
                    if (!item.item_id) {
                        throw new Error(`Item ${index + 1} must have item_id`);
                    }
                    if (!item.quantity || item.quantity <= 0) {
                        throw new Error(`Item ${index + 1} must have valid quantity`);
                    }
                });

                return true;
            } catch (error) {
                throw new Error(`Invalid item format: ${error.message}`);
            }
        }),
    body('prob_rate')
        .notEmpty()
        .withMessage('Probability rate is required')        
        .custom((value) => {
            const num = parseFloat(value);
            if (num < 0 || num > 100) {
                throw new Error('Probability rate must be between 0 and 100');
            }
            return true;
        })
];

// Public routes
router.get('/active', getActivePackets);
router.post('/buyGachaPacket', buyGachaPacket);
router.get('/history', getGachaHistory);

// Protected routes (Admin only)
router.get('/', authenticateToken, requireRole('admin'), getAllPackets);
router.get('/statistics', authenticateToken, requireRole('admin'), getStatistics);
router.get('/test-random', authenticateToken, requireRole('admin'), testWeightedRandom);
router.get('/:id', authenticateToken, requireRole('admin'), getPacketById);

router.post('/', 
    authenticateToken, 
    requireRole('admin'), 
    packetValidation, 
    createPacket
);

router.put('/:id', 
    authenticateToken, 
    requireRole('admin'), 
    packetValidation, 
    updatePacket
);

router.delete('/:id', authenticateToken, requireRole('admin'), deletePacket);

// Toggle status routes
router.patch('/:id/toggle-active', authenticateToken, requireRole('admin'), toggleActiveStatus);
router.patch('/:id/toggle-equipment', authenticateToken, requireRole('admin'), toggleEquipmentStatus);

module.exports = router;
