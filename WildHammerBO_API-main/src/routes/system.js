const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middlewares/auth');
const syncService = require('../services/syncService');
const gameService = require('../services/gameService');
const redisManager = require('../config/redis');
const transactionManager = require('../utils/transactionManager');

// System health check
router.get('/health', async (req, res) => {
    try {
        const health = await syncService.healthCheck();
        const syncStats = syncService.getSyncStats();

        res.json({
            success: true,
            health,
            sync: syncStats,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Health check failed',
            message: error.message
        });
    }
});

// Debug endpoint to see request origin and headers
router.get('/debug-origin', (req, res) => {
    const origin = req.get('Origin');
    const userAgent = req.get('User-Agent');
    const xForwardedFor = req.get('X-Forwarded-For');
    const xRealIp = req.get('X-Real-IP');
    const remoteAddress = req.connection.remoteAddress || req.socket.remoteAddress;
    
    res.json({
        success: true,
        debug: {
            origin: origin,
            userAgent: userAgent,
            ip: {
                remoteAddress: remoteAddress,
                xForwardedFor: xForwardedFor,
                xRealIp: xRealIp
            },
            headers: req.headers,
            timestamp: new Date().toISOString()
        }
    });
});

router.get('/activeServers', async (req, res) => {
    try {
        const activeServers = await gameService.getActiveServers();
        res.json({
            success: true,
            activeServers
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Active servers check failed',
            message: error.message
        });
    }
});

// Detailed system status (admin only)
router.get('/status', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const health = await syncService.healthCheck();
        const syncStats = syncService.getSyncStats();
        const redisStatus = redisManager.getStatus();
        const activeTransactions = transactionManager.getActiveTransactions();

        res.json({
            success: true,
            system: {
                health,
                sync: syncStats,
                redis: redisStatus,
                transactions: {
                    active: activeTransactions.length,
                    details: activeTransactions
                },
                server: {
                    uptime: process.uptime(),
                    memory: process.memoryUsage(),
                    nodeVersion: process.version,
                    platform: process.platform
                }
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'System status check failed',
            message: error.message
        });
    }
});

// Cache management (super admin only)
router.post('/cache', authenticateToken, requireRole('super_admin'), async (req, res) => {
    try {
        const { action, pattern, key } = req.body;

        switch (action) {
            case 'flush':
                if (pattern) {
                    await redisManager.flushPattern(pattern);
                    res.json({ 
                        success: true, 
                        message: `Cache pattern flushed: ${pattern}` 
                    });
                } else {
                    res.status(400).json({ 
                        success: false, 
                        message: 'Pattern required for flush' 
                    });
                }
                break;

            case 'delete':
                if (key) {
                    await redisManager.del(key);
                    res.json({ 
                        success: true, 
                        message: `Cache key deleted: ${key}` 
                    });
                } else {
                    res.status(400).json({ 
                        success: false, 
                        message: 'Key required for delete' 
                    });
                }
                break;

            case 'cleanup':
                const result = await syncService.cleanupCache();
                res.json({ 
                    success: true, 
                    message: 'Cache cleanup completed', 
                    result 
                });
                break;

            default:
                res.status(400).json({ 
                    success: false, 
                    message: 'Invalid action' 
                });
        }

    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Cache management failed',
            message: error.message
        });
    }
});

// Transaction monitoring (admin only)
router.get('/transactions', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const activeTransactions = transactionManager.getActiveTransactions();
        
        res.json({
            success: true,
            transactions: {
                count: activeTransactions.length,
                active: activeTransactions
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Transaction monitoring failed',
            message: error.message
        });
    }
});

// Manual transaction cleanup (super admin only)
router.post('/transactions/cleanup', authenticateToken, requireRole('super_admin'), async (req, res) => {
    try {
        const { maxAge } = req.body;
        const cleanedCount = await transactionManager.cleanupOldTransactions(maxAge);
        
        res.json({
            success: true,
            message: `Cleaned up ${cleanedCount} old transactions`,
            cleanedCount
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Transaction cleanup failed',
            message: error.message
        });
    }
});

module.exports = router;