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
    getDraftPackets,
    createDraft,
    publishDraft,
    getStatistics,
    toggleActiveStatus,
    incrementSentCount,
    resetSentCount,
    sendEmailPacket,
    sendEmailPacketBulk,
} = require('../controllers/emailPacket.Controller');
const { authenticateToken, requireRole } = require('../middlewares/auth');



// Validation rules for email packet
const emailPacketValidation = [
    body('title')
        .notEmpty()
        .withMessage('Title is required')
        .isLength({ min: 1, max: 50 })
        .withMessage('Title must be between 1 and 50 characters'),
    body('content')
        .optional()
        .isLength({ max: 400 })
        .withMessage('Content must not exceed 400 characters'),
    body('game_items')
        .optional()
        .custom((value) => {
            if (value === null || value === undefined) return true;
            try {
                if (typeof value === 'string') {
                    JSON.parse(value);
                } else if (typeof value === 'object') {
                    JSON.stringify(value);
                }
                return true;
            } catch (error) {
                throw new Error('Game items must be valid JSON');
            }
        }),
    body('equipment_items')
        .optional()
        .custom((value) => {
            if (value === null || value === undefined) return true;
            try {
                if (typeof value === 'string') {
                    JSON.parse(value);
                } else if (typeof value === 'object') {
                    JSON.stringify(value);
                }
                return true;
            } catch (error) {
                throw new Error('Equipment items must be valid JSON');
            }
        }),
    body('is_active')
        .optional()
        .isBoolean()
        .withMessage('is_active must be a boolean')
];

// Validation rules for draft (more lenient)
const draftValidation = [
    body('title')
        .optional()
        .isLength({ min: 1, max: 50 })
        .withMessage('Title must be between 1 and 50 characters'),
    body('content')
        .optional()
        .isLength({ max: 400 })
        .withMessage('Content must not exceed 400 characters'),
    body('game_items')
        .optional()
        .custom((value) => {
            if (value === null || value === undefined) return true;
            try {
                if (typeof value === 'string') {
                    JSON.parse(value);
                } else if (typeof value === 'object') {
                    JSON.stringify(value);
                }
                return true;
            } catch (error) {
                throw new Error('Game items must be valid JSON');
            }
        }),
    body('equipment_items')
        .optional()
        .custom((value) => {
            if (value === null || value === undefined) return true;
            try {
                if (typeof value === 'string') {
                    JSON.parse(value);
                } else if (typeof value === 'object') {
                    JSON.stringify(value);
                }
                return true;
            } catch (error) {
                throw new Error('Equipment items must be valid JSON');
            }
        })
];

// Public routes
router.get('/active', getActivePackets);

// Protected routes (Admin only)
router.get('/', authenticateToken, requireRole('admin'), getAllPackets);
router.get('/statistics', authenticateToken, requireRole('admin'), getStatistics);
router.get('/drafts', authenticateToken, requireRole('admin'), getDraftPackets);
router.get('/:id', authenticateToken, requireRole('admin'), getPacketById);

// Create routes
router.post('/', 
    authenticateToken, 
    requireRole('admin'), 
    emailPacketValidation, 
    createPacket
);

router.post('/draft', 
    authenticateToken, 
    requireRole('admin'), 
    draftValidation, 
    createDraft
);

// Update routes
router.put('/:id', 
    authenticateToken, 
    requireRole('admin'), 
    emailPacketValidation, 
    updatePacket
);

// Delete route
router.delete('/:id', authenticateToken, requireRole('admin'), deletePacket);

// Special action routes
router.patch('/:id/toggle-active', authenticateToken, requireRole('admin'), toggleActiveStatus);
router.patch('/:id/publish', authenticateToken, requireRole('admin'), publishDraft);
router.patch('/:id/increment-sent', authenticateToken, requireRole('admin'), incrementSentCount);
router.patch('/:id/reset-sent', authenticateToken, requireRole('admin'), resetSentCount);

router.post('/send/:id', authenticateToken, requireRole('admin'), sendEmailPacket);
router.post('/send-bulk', authenticateToken, requireRole('admin'), sendEmailPacketBulk);

module.exports = router;
