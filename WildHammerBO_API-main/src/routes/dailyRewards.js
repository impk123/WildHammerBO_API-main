const express = require('express');
const router = express.Router();
const { body, query, param } = require('express-validator');
const DailyRewardController = require('../controllers/dailyReward.Controller');
const { authenticateToken } = require('../middlewares/auth');

// Admin Routes (require authentication)
router.get('/admin/rewards', 
    authenticateToken,
    [
        query('is_active').optional().isInt({ min: 0, max: 1 }),
        query('day_number').optional().isInt({ min: 1 }),
        query('limit').optional().isInt({ min: 1, max: 100 }),
        query('offset').optional().isInt({ min: 0 })
    ],
    DailyRewardController.getAllRewards
);

router.get('/admin/rewards/:dayNumber', 
    authenticateToken,
    [
        param('dayNumber').isInt({ min: 1 })
    ],
    DailyRewardController.getRewardByDay
);

router.post('/admin/rewards', 
    authenticateToken,
    [
        body('day_number').isInt({ min: 1 }),
        body('reward_items').optional().isArray(),
        body('reward_equipment').optional().isArray(),
        body('reward_tokens').optional().isDecimal({ decimal_digits: '0,2' }),
        body('is_active').optional().isBoolean()
    ],
    DailyRewardController.createReward
);

router.put('/admin/rewards/:dayNumber', 
    authenticateToken,
    [
        param('dayNumber').isInt({ min: 1 }),
        body('reward_items').optional().isArray(),
        body('reward_equipment').optional().isArray(),
        body('reward_tokens').optional().isDecimal({ decimal_digits: '0,2' }),
        body('is_active').optional().isBoolean()
    ],
    DailyRewardController.updateReward
);

router.delete('/admin/rewards/:dayNumber', 
    authenticateToken,
    [
        param('dayNumber').isInt({ min: 1 })
    ],
    DailyRewardController.deleteReward
);

router.patch('/admin/rewards/:dayNumber/toggle', 
    authenticateToken,
    [
        param('dayNumber').isInt({ min: 1 })
    ],
    DailyRewardController.toggleRewardStatus
);

router.post('/admin/rewards/bulk-create', 
    authenticateToken,
    [
        body('totalDays').isInt({ min: 1, max: 365 }),
        body('startDate').isISO8601().toDate(),
        body('cycleName').optional().isString()
    ],
    DailyRewardController.createMultipleRewards
);

router.post('/admin/rewards/copy', 
    authenticateToken,
    [
        body('fromStartDate').isISO8601().toDate(),
        body('fromEndDate').isISO8601().toDate(),
        body('toStartDate').isISO8601().toDate()
    ],
    DailyRewardController.copyRewards
);

router.get('/admin/cycles/current', 
    authenticateToken,
    DailyRewardController.getCurrentCycle
);

router.get('/admin/cycles', 
    authenticateToken,
    DailyRewardController.getAllCycles
);

router.get('/admin/statistics', 
    authenticateToken,
    DailyRewardController.getStatistics
);

router.get('/admin/claims', 
    authenticateToken,
    [
        query('roleid').optional().isString(),
        query('day_number').optional().isInt({ min: 1 }),
        query('date_from').optional().isISO8601().toDate(),
        query('date_to').optional().isISO8601().toDate(),
        query('limit').optional().isInt({ min: 1, max: 100 }),
        query('offset').optional().isInt({ min: 0 })
    ],
    DailyRewardController.getAllClaims
);

router.get('/admin/claim-statistics', 
    authenticateToken,
    DailyRewardController.getClaimStatistics
);

// Client Routes (no authentication required, but token validation in controller)
router.post('/client/progress', 
    [
        body('token').notEmpty().isString()
    ],
    DailyRewardController.getUserProgress
);

router.post('/client/claim', 
    [
        body('token').notEmpty().isString()
    ],
    DailyRewardController.claimDailyReward
);

router.post('/client/history', 
    [
        body('token').notEmpty().isString(),
        query('limit').optional().isInt({ min: 1, max: 100 }),
        query('offset').optional().isInt({ min: 0 })
    ],
    DailyRewardController.getUserClaimHistory
);

// Debug route to check cycle and date calculation
router.get('/debug/cycle', DailyRewardController.debugCycle);

// Admin route to rollback a claim
router.delete('/admin/claims/:claimId/rollback',
    authenticateToken,
    [
        param('claimId').isInt({ min: 1 }).withMessage('Claim ID must be a positive integer')
    ],
    DailyRewardController.rollBackClaim
);

// Public route to get available rewards (for display purposes)
router.get('/public/rewards', 
    [
        query('is_active').optional().isInt({ min: 0, max: 1 }),
        query('limit').optional().isInt({ min: 1, max: 100 })
    ],
    DailyRewardController.getAllRewards
);

module.exports = router;
