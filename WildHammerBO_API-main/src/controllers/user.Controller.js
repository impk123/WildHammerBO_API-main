const userBanService = require('../services/userBanService');
const gameService = require('../services/gameService');

const db_backoffice = require('../models/db_backoffice');

// Ban a user
exports.banUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const { reason, banType = 'permanent', durationHours } = req.body;
        
        // Validate input
        if (!userId || !reason) {
            return res.status(400).json({
                success: false,
                message: 'User ID and ban reason are required'
            });
        }

        if (banType === 'temporary' && !durationHours) {
            return res.status(400).json({
                success: false,
                message: 'Duration in hours is required for temporary bans'
            });
        }

        if (banType === 'temporary' && (durationHours <= 0 || durationHours > 8760)) { // Max 1 year
            return res.status(400).json({
                success: false,
                message: 'Duration must be between 1 hour and 8760 hours (1 year)'
            });
        }

        // Get client info for logging
        const clientInfo = {
            ip_address: req.ip || req.connection.remoteAddress,
            user_agent: req.get('User-Agent')
        };

        // Ban the user
        const result = await userBanService.banUser(
            parseInt(userId),
            req.admin.id,
            {
                reason,
                banType,
                durationHours: banType === 'temporary' ? parseInt(durationHours) : null
            },
            clientInfo
        );

        res.status(200).json(result);

    } catch (error) {
        console.error('Ban user error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to ban user'
        });
    }
};

// Unban a user
exports.unbanUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const { reason = 'Unban by admin' } = req.body;
        
        // Validate input
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        // Get client info for logging
        const clientInfo = {
            ip_address: req.ip || req.connection.remoteAddress,
            user_agent: req.get('User-Agent')
        };

        // Unban the user
        const result = await userBanService.unbanUser(
            parseInt(userId),
            req.admin.id,
            reason,
            clientInfo
        );

        res.status(200).json(result);

    } catch (error) {
        console.error('Unban user error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to unban user'
        });
    }
};

// Get user ban history
exports.getUserBanHistory = async (req, res) => {
    try {
        const { userId } = req.params;
        const { limit = 50, offset = 0 } = req.query;
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        const result = await userBanService.getUserBanHistory(
            parseInt(userId),
            parseInt(limit),
            parseInt(offset)
        );

        res.status(200).json(result);

    } catch (error) {
        console.error('Get user ban history error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to get user ban history'
        });
    }
};

// Get banned users list
exports.getBannedUsers = async (req, res) => {
    try {
        const { 
            limit = 50, 
            offset = 0, 
            banType, 
            adminId, 
            search 
        } = req.query;

        const filters = {};
        if (banType) filters.banType = banType;
        if (adminId) filters.adminId = parseInt(adminId);
        if (search) filters.search = search;

        const result = await userBanService.getBannedUsers(
            parseInt(limit),
            parseInt(offset),
            filters
        );

        res.status(200).json(result);

    } catch (error) {
        console.error('Get banned users error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to get banned users'
        });
    }
};

// Get ban statistics
exports.getBanStatistics = async (req, res) => {
    try {
        const result = await userBanService.getBanStatistics();
        res.status(200).json(result);

    } catch (error) {
        console.error('Get ban statistics error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to get ban statistics'
        });
    }
};

// Process expired bans (manual trigger)
exports.processExpiredBans = async (req, res) => {
    try {
        const result = await userBanService.processExpiredBans();
        res.status(200).json(result);

    } catch (error) {
        console.error('Process expired bans error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to process expired bans'
        });
    }
};

// Check game service status
exports.getGameServiceStatus = async (req, res) => {
    try {
        const healthCheck = await gameService.checkGameServiceHealth();
        
        res.status(200).json({
            success: true,
            gameService: {
                connected: healthCheck.success,
                healthy: healthCheck.healthy,
                statusCode: healthCheck.statusCode,
                error: healthCheck.error || null,
                lastChecked: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Game service status error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to check game service status'
        });
    }
};

// Sync banned users to game service
exports.syncBannedUsersToGame = async (req, res) => {
    try {
        // Get all currently banned users
        const bannedUsersResult = await userBanService.getBannedUsers(1000, 0); // Get up to 1000 banned users
        
        if (!bannedUsersResult.success || bannedUsersResult.bannedUsers.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'No banned users to sync',
                syncedCount: 0
            });
        }

        // Sync to game service
        const syncResult = await gameService.syncBannedUsers(bannedUsersResult.bannedUsers);

        res.status(200).json({
            success: true,
            message: 'Banned users sync completed',
            totalBannedUsers: bannedUsersResult.bannedUsers.length,
            gameServiceResponse: syncResult
        });

    } catch (error) {
        console.error('Sync banned users error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to sync banned users to game service'
        });
    }
};

// Get user status (including ban info)
exports.getUserStatus = async (req, res) => {
    try {
        const { userId } = req.params;
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        // Get user status from database
        
        const pool = db_backoffice.getPool();
        
        const [userRows] = await pool.execute(`
            SELECT 
                u.*,
                a.username as banned_by_admin,
                CASE 
                    WHEN u.is_active = 'banned' AND u.ban_expires_at IS NOT NULL AND u.ban_expires_at > NOW() THEN 'temporary_banned'
                    WHEN u.is_active = 'banned' AND (u.ban_expires_at IS NULL OR u.ban_expires_at <= NOW()) THEN 'permanently_banned'
                    WHEN u.is_active = 'inactive' THEN 'inactive'
                    WHEN u.is_active = '1' THEN 'active'
                    ELSE 'unknown'
                END as status_description,
                CASE 
                    WHEN u.ban_expires_at IS NOT NULL AND u.ban_expires_at > NOW() 
                    THEN TIMESTAMPDIFF(HOUR, NOW(), u.ban_expires_at)
                    ELSE NULL
                END as hours_remaining
            FROM users u
            LEFT JOIN admins a ON u.banned_by = a.id
            WHERE u.id = ?
        `, [parseInt(userId)]);

        if (userRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const user = userRows[0];

        // Get game service status for this user
        let gameStatus = null;
        try {
            const gameResult = await gameService.getUserStatus(userId);
            gameStatus = gameResult.success ? gameResult.userStatus : null;
        } catch (gameError) {
            console.warn('Failed to get game status for user:', gameError.message);
        }

        res.status(200).json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                status: user.is_active,
                statusDescription: user.status_description,
                banReason: user.ban_reason,
                bannedAt: user.banned_at,
                bannedByAdmin: user.banned_by_admin,
                banExpiresAt: user.ban_expires_at,
                hoursRemaining: user.hours_remaining,
                createdAt: user.created_at,
                updatedAt: user.updated_at
            },
            gameStatus: gameStatus
        });

    } catch (error) {
        console.error('Get user status error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to get user status'
        });
    }
};
