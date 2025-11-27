const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
    sendEmail,
    sendSingleEmail,
    sendBulkEmail,
    previewEmail,
    getEmailList,
    syncGlobalEmails,
    cleanupExpiredEmails,
    getSendEmailStatistics
} = require('../controllers/sendEmail.Controller');
const { authenticateToken, requireRole } = require('../middlewares/auth');

// Validation rules for send email
const sendEmailValidation = [
    body('owner')
        .notEmpty()
        .withMessage('Owner is required')
        .custom((value) => {
            if (Array.isArray(value)) {
                if (value.length === 0) {
                    throw new Error('Owner array cannot be empty');
                }
                // Validate each owner
                value.forEach((owner, index) => {
                    if (!owner || typeof owner !== 'string') {
                        throw new Error(`Owner at index ${index} must be a valid string`);
                    }
                });
            } else if (typeof value !== 'string') {
                throw new Error('Owner must be a string or array of strings');
            }
            return true;
        }),
    body('id')
        .notEmpty()
        .withMessage('Email packet ID is required')
        .isInt({ min: 1 })
        .withMessage('Email packet ID must be a positive integer'),
    body('gameId')
        .notEmpty()
        .withMessage('Game ID is required')
        .isInt({ min: 1 })
        .withMessage('Game ID must be a positive integer'),
    body('serverId')
        .notEmpty()
        .withMessage('Server ID is required')
        .isInt({ min: 1 })
        .withMessage('Server ID must be a positive integer')
];

// Validation rules for single email
const singleEmailValidation = [
    body('recipient')
        .notEmpty()
        .withMessage('Recipient is required')
        .isString()
        .withMessage('Recipient must be a string'),
    body('id')
        .notEmpty()
        .withMessage('Email packet ID is required')
        .isInt({ min: 1 })
        .withMessage('Email packet ID must be a positive integer'),
    body('gameId')
        .notEmpty()
        .withMessage('Game ID is required')
        .isInt({ min: 1 })
        .withMessage('Game ID must be a positive integer'),
    body('serverId')
        .notEmpty()
        .withMessage('Server ID is required')
        .isInt({ min: 1 })
        .withMessage('Server ID must be a positive integer')
];

// Validation rules for bulk email
const bulkEmailValidation = [
    body('recipients')
        .notEmpty()
        .withMessage('Recipients is required')
        .isArray({ min: 1 })
        .withMessage('Recipients must be a non-empty array')
        .custom((value) => {
            value.forEach((recipient, index) => {
                if (!recipient || typeof recipient !== 'string') {
                    throw new Error(`Recipient at index ${index} must be a valid string`);
                }
            });
            return true;
        }),
    body('id')
        .notEmpty()
        .withMessage('Email packet ID is required')
        .isInt({ min: 1 })
        .withMessage('Email packet ID must be a positive integer'),
    body('gameId')
        .notEmpty()
        .withMessage('Game ID is required')
        .isInt({ min: 1 })
        .withMessage('Game ID must be a positive integer'),
    body('serverId')
        .notEmpty()
        .withMessage('Server ID is required')
        .isInt({ min: 1 })
        .withMessage('Server ID must be a positive integer')
];

// Validation rules for preview
const previewValidation = [
    body('id')
        .notEmpty()
        .withMessage('Email packet ID is required')
        .isInt({ min: 1 })
        .withMessage('Email packet ID must be a positive integer')
];

// Validation rules for sync global emails
const syncGlobalValidation = [
    body('serverid')
        .notEmpty()
        .withMessage('Server ID is required')
        .isInt({ min: 1 })
        .withMessage('Server ID must be a positive integer'),
    body('roleId')
        .notEmpty()
        .withMessage('Role ID is required')
        .isString()
        .withMessage('Role ID must be a string')
];

// All routes require admin authentication
router.use(authenticateToken, requireRole('admin'));

// Send email routes
router.post('/', sendEmailValidation, sendEmail);
router.post('/single', singleEmailValidation, sendSingleEmail);
router.post('/bulk', bulkEmailValidation, sendBulkEmail);
router.post('/preview', previewValidation, previewEmail);

// Redis cache management routes
router.get('/list/:serverid/:roleId', getEmailList);
router.post('/sync-global', syncGlobalValidation, syncGlobalEmails);
router.delete('/cleanup/:serverid/:roleId', cleanupExpiredEmails);

// Statistics route
router.get('/statistics', getSendEmailStatistics);

module.exports = router;
