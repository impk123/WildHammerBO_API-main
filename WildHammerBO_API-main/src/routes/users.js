const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { authenticateToken, requireRole, requirePermission } = require('../middlewares/auth');

// Import user ban controllers
const {
    banUser,
    unbanUser,
    getUserBanHistory,
    getBannedUsers,
    getBanStatistics,
    processExpiredBans,
    getGameServiceStatus,
    syncBannedUsersToGame,
    getUserStatus
} = require('../controllers/user.Controller');

// Import currency controllers
const {
    getUserCurrency,
    updateUserCurrency,
    getCurrencyHistory,
    searchUsers,
    getCurrencyStatistics
} = require('../controllers/currency.Controller');

// All routes require authentication
router.use(authenticateToken);

// ====== CURRENCY MANAGEMENT ROUTES ======

// Search users for currency management - requires user_management permission
router.get('/search', requirePermission('user_management'), searchUsers);

// Get currency statistics - requires view_reports permission  
router.get('/currency/statistics', requirePermission('view_reports'), getCurrencyStatistics);

// Get user's current currency information - requires user_management permission
router.get('/:userId/currency', requirePermission('user_management'), getUserCurrency);

// Update user's currency (add/subtract/set) - requires user_management permission
router.patch('/:userId/currency', 
    requirePermission('user_management'),
    [
        body('action').isIn(['add', 'subtract', 'set']).withMessage('Action must be add, subtract, or set'),
        body('amount').isInt({ min: 0 }).withMessage('Amount must be a non-negative integer'),
        body('currency_type').isIn(['coins', 'gems']).withMessage('Currency type must be coins or gems'),
        body('reason').optional().isLength({ max: 500 }).withMessage('Reason must not exceed 500 characters')
    ],
    updateUserCurrency
);

// Get currency update history for a user - requires user_management permission
router.get('/:userId/currency/history', requirePermission('user_management'), getCurrencyHistory);

// ====== USER BAN MANAGEMENT ROUTES ======
// Ban a user - requires user_management permission
router.post('/:userId/ban', requirePermission('user_management'), banUser);

// Unban a user - requires user_management permission  
router.post('/:userId/unban', requirePermission('user_management'), unbanUser);

// Get user status (including ban info) - requires user_management permission
router.get('/:userId/status', requirePermission('user_management'), getUserStatus);

// Get user ban history - requires user_management permission
router.get('/:userId/ban-history', requirePermission('user_management'), getUserBanHistory);

// User List and Statistics Routes
// Get banned users list - requires user_management permission
router.get('/banned', requirePermission('user_management'), getBannedUsers);

// Get ban statistics - requires view_reports permission
router.get('/ban-statistics', requirePermission('view_reports'), getBanStatistics);

// Administrative Routes
// Process expired bans manually - requires admin role
router.post('/process-expired-bans', requireRole('admin'), processExpiredBans);

// Game Service Integration Routes
// Check game service status - requires user_management permission
router.get('/game-service/status', requirePermission('user_management'), getGameServiceStatus);

// Sync banned users to game service - requires admin role
router.post('/game-service/sync-bans', requireRole('admin'), syncBannedUsersToGame);

// Health check for user management system
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'User Ban Management System is operational',
        timestamp: new Date().toISOString(),
        admin: {
            id: req.admin?.id,
            email: req.admin?.email,
            role: req.admin?.role
        }
    });
});

module.exports = router;
