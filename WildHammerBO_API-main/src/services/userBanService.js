const db_backoffice = require('../models/db_backoffice');
const gameService = require('./gameService');
const { transactionManager } = require('../config/redis');

class UserBanService {
    constructor() {
        this.cachePrefix = 'user_ban';
        this.cacheTTL = 3600; // 1 hour
    }

    // Ban a user
    async banUser(userId, adminId, banData, clientInfo = {}) {
        const { transactionId, connection } = await transactionManager.beginTransaction();
        
        try {
            // Validate user exists and is not already banned
            const [userRows] = await connection.execute(
                'SELECT id, email, is_active FROM users WHERE id = ?',
                [userId]
            );

            if (userRows.length === 0) {
                throw new Error('User not found');
            }

            const user = userRows[0];
            if (user.is_active === 'banned') {
                throw new Error('User is already banned');
            }

            // Calculate expiration time for temporary bans
            let expiresAt = null;
            if (banData.banType === 'temporary' && banData.durationHours) {
                expiresAt = new Date();
                expiresAt.setHours(expiresAt.getHours() + banData.durationHours);
            }

            // Update user status to banned
            await transactionManager.executeInTransaction(transactionId, async (conn) => {
                await conn.execute(
                    `UPDATE users SET 
                     is_active = 'banned', 
                     ban_reason = ?, 
                     banned_at = NOW(), 
                     banned_by = ?, 
                     ban_expires_at = ?,
                     updated_at = NOW()
                     WHERE id = ?`,
                    [banData.reason, adminId, expiresAt, userId]
                );
                return { operation: 'update_user_status' };
            }, [`${this.cachePrefix}:user:${userId}`]);

            // Insert ban record
            const banRecord = await transactionManager.executeInTransaction(transactionId, async (conn) => {
                const [result] = await conn.execute(
                    `INSERT INTO user_bans 
                     (user_id, admin_id, action, reason, ban_type, ban_duration_hours, expires_at, ip_address, user_agent, created_at) 
                     VALUES (?, ?, 'ban', ?, ?, ?, ?, ?, ?, NOW())`,
                    [
                        userId, 
                        adminId, 
                        banData.reason, 
                        banData.banType || 'permanent',
                        banData.durationHours || null,
                        expiresAt,
                        clientInfo.ip_address || null,
                        clientInfo.user_agent || null
                    ]
                );
                return { banRecordId: result.insertId };
            });

            // Log admin activity
            await transactionManager.executeInTransaction(transactionId, async (conn) => {
                await conn.execute(
                    `INSERT INTO admin_logs 
                     (admin_id, action, details, ip_address, user_agent, created_at) 
                     VALUES (?, 'user_ban', ?, ?, ?, NOW())`,
                    [
                        adminId,
                        JSON.stringify({
                            user_id: userId,
                            user_email: user.email,
                            ban_type: banData.banType,
                            reason: banData.reason,
                            duration_hours: banData.durationHours,
                            expires_at: expiresAt
                        }),
                        clientInfo.ip_address || null,
                        clientInfo.user_agent || null
                    ]
                );
                return { operation: 'log_admin_activity' };
            });

            // Notify game service (don't let game service failure break the ban)
            let gameNotification = { success: false, error: 'Not attempted' };
            try {
                gameNotification = await gameService.notifyUserBan(userId, {
                    reason: banData.reason,
                    banType: banData.banType,
                    duration: banData.durationHours,
                    expiresAt: expiresAt,
                    adminId: adminId
                });

                // Update ban record with game service response
                await transactionManager.executeInTransaction(transactionId, async (conn) => {
                    await conn.execute(
                        'UPDATE user_bans SET game_notified = ?, game_response = ? WHERE id = ?',
                        [
                            gameNotification.success ? 1 : 0,
                            JSON.stringify(gameNotification),
                            banRecord.banRecordId
                        ]
                    );
                    return { operation: 'update_game_notification' };
                });

            } catch (gameError) {
                console.error('Game service notification failed:', gameError.message);
                gameNotification = { success: false, error: gameError.message };
            }

            // Define cache invalidation operations
            const syncOperations = [
                { type: 'delete', key: `${this.cachePrefix}:user:${userId}` },
                { type: 'flush_pattern', pattern: `${this.cachePrefix}:list:*` },
                { type: 'flush_pattern', pattern: `user:*` }
            ];

            // Commit transaction
            await transactionManager.commitTransaction(transactionId, syncOperations);

            console.log(`✅ User banned successfully: ${user.email} (ID: ${userId})`);

            return {
                success: true,
                message: 'User banned successfully',
                banRecord: {
                    id: banRecord.banRecordId,
                    userId: userId,
                    userEmail: user.email,
                    banType: banData.banType,
                    reason: banData.reason,
                    expiresAt: expiresAt,
                    gameNotified: gameNotification.success
                },
                gameNotification: gameNotification
            };

        } catch (error) {
            await transactionManager.rollbackTransaction(transactionId);
            console.error('❌ Ban user failed:', error.message);
            throw error;
        }
    }

    // Unban a user
    async unbanUser(userId, adminId, reason, clientInfo = {}) {
        const { transactionId, connection } = await transactionManager.beginTransaction();
        
        try {
            // Validate user exists and is banned
            const [userRows] = await connection.execute(
                'SELECT id, email, is_active, ban_reason FROM users WHERE id = ?',
                [userId]
            );

            if (userRows.length === 0) {
                throw new Error('User not found');
            }

            const user = userRows[0];
            if (user.is_active !== 'banned') {
                throw new Error('User is not banned');
            }

            // Update user status to active
            await transactionManager.executeInTransaction(transactionId, async (conn) => {
                await conn.execute(
                    `UPDATE users SET 
                     is_active = '1', 
                     ban_reason = NULL, 
                     banned_at = NULL, 
                     banned_by = NULL, 
                     ban_expires_at = NULL,
                     updated_at = NOW()
                     WHERE id = ?`,
                    [userId]
                );
                return { operation: 'update_user_status' };
            }, [`${this.cachePrefix}:user:${userId}`]);

            // Insert unban record
            const unbanRecord = await transactionManager.executeInTransaction(transactionId, async (conn) => {
                const [result] = await conn.execute(
                    `INSERT INTO user_bans 
                     (user_id, admin_id, action, reason, ip_address, user_agent, created_at) 
                     VALUES (?, ?, 'unban', ?, ?, ?, NOW())`,
                    [
                        userId, 
                        adminId, 
                        reason,
                        clientInfo.ip_address || null,
                        clientInfo.user_agent || null
                    ]
                );
                return { unbanRecordId: result.insertId };
            });

            // Log admin activity
            await transactionManager.executeInTransaction(transactionId, async (conn) => {
                await conn.execute(
                    `INSERT INTO admin_logs 
                     (admin_id, action, details, ip_address, user_agent, created_at) 
                     VALUES (?, 'user_unban', ?, ?, ?, NOW())`,
                    [
                        adminId,
                        JSON.stringify({
                            user_id: userId,
                            user_email: user.email,
                            previous_ban_reason: user.ban_reason,
                            unban_reason: reason
                        }),
                        clientInfo.ip_address || null,
                        clientInfo.user_agent || null
                    ]
                );
                return { operation: 'log_admin_activity' };
            });

            // Notify game service
            let gameNotification = { success: false, error: 'Not attempted' };
            try {
                gameNotification = await gameService.notifyUserUnban(userId, {
                    reason: reason,
                    adminId: adminId
                });

                // Update unban record with game service response
                await transactionManager.executeInTransaction(transactionId, async (conn) => {
                    await conn.execute(
                        'UPDATE user_bans SET game_notified = ?, game_response = ? WHERE id = ?',
                        [
                            gameNotification.success ? 1 : 0,
                            JSON.stringify(gameNotification),
                            unbanRecord.unbanRecordId
                        ]
                    );
                    return { operation: 'update_game_notification' };
                });

            } catch (gameError) {
                console.error('Game service notification failed:', gameError.message);
                gameNotification = { success: false, error: gameError.message };
            }

            // Define cache invalidation operations
            const syncOperations = [
                { type: 'delete', key: `${this.cachePrefix}:user:${userId}` },
                { type: 'flush_pattern', pattern: `${this.cachePrefix}:list:*` },
                { type: 'flush_pattern', pattern: `user:*` }
            ];

            // Commit transaction
            await transactionManager.commitTransaction(transactionId, syncOperations);

            console.log(`✅ User unbanned successfully: ${user.email} (ID: ${userId})`);

            return {
                success: true,
                message: 'User unbanned successfully',
                unbanRecord: {
                    id: unbanRecord.unbanRecordId,
                    userId: userId,
                    userEmail: user.email,
                    reason: reason,
                    gameNotified: gameNotification.success
                },
                gameNotification: gameNotification
            };

        } catch (error) {
            await transactionManager.rollbackTransaction(transactionId);
            console.error('❌ Unban user failed:', error.message);
            throw error;
        }
    }

    // Get user ban history
    async getUserBanHistory(userId, limit = 50, offset = 0) {
        try {
            const pool = db_backoffice.getPool();
            
            const [rows] = await pool.execute(
                `SELECT 
                    ub.*,
                    a.username as admin_username,
                    a.email as admin_email
                 FROM user_bans ub
                 LEFT JOIN admins a ON ub.admin_id = a.id
                 WHERE ub.user_id = ?
                 ORDER BY ub.created_at DESC
                 LIMIT ? OFFSET ?`,
                [userId, limit, offset]
            );

            const [countRows] = await pool.execute(
                'SELECT COUNT(*) as total FROM user_bans WHERE user_id = ?',
                [userId]
            );

            return {
                success: true,
                banHistory: rows,
                pagination: {
                    total: countRows[0].total,
                    limit: limit,
                    offset: offset,
                    hasMore: countRows[0].total > (offset + limit)
                }
            };

        } catch (error) {
            console.error('❌ Get user ban history failed:', error.message);
            throw error;
        }
    }

    // Get banned users list
    async getBannedUsers(limit = 50, offset = 0, filters = {}) {
        try {
            const pool = db_backoffice.getPool();
            
            let whereClause = "WHERE u.is_active = 'banned'";
            let params = [];

            // Add filters
            if (filters.banType) {
                if (filters.banType === 'temporary') {
                    whereClause += " AND u.ban_expires_at IS NOT NULL AND u.ban_expires_at > NOW()";
                } else if (filters.banType === 'permanent') {
                    whereClause += " AND (u.ban_expires_at IS NULL OR u.ban_expires_at <= NOW())";
                }
            }

            if (filters.adminId) {
                whereClause += " AND u.banned_by = ?";
                params.push(filters.adminId);
            }

            if (filters.search) {
                whereClause += " AND u.email LIKE ?";
                params.push(`%${filters.search}%`);
            }

            const [rows] = await pool.execute(
                `SELECT 
                    u.id,
                    u.email,
                    u.is_active,
                    u.ban_reason,
                    u.banned_at,
                    u.ban_expires_at,
                    a.username as banned_by_admin,
                    a.email as banned_by_email,
                    CASE 
                        WHEN u.ban_expires_at IS NOT NULL AND u.ban_expires_at > NOW() THEN 'temporary'
                        ELSE 'permanent'
                    END as ban_type,
                    CASE 
                        WHEN u.ban_expires_at IS NOT NULL AND u.ban_expires_at > NOW() 
                        THEN TIMESTAMPDIFF(HOUR, NOW(), u.ban_expires_at)
                        ELSE NULL
                    END as hours_remaining
                 FROM users u
                 LEFT JOIN admins a ON u.banned_by = a.id
                 ${whereClause}
                 ORDER BY u.banned_at DESC
                 LIMIT ? OFFSET ?`,
                [...params, limit, offset]
            );

            const [countRows] = await pool.execute(
                `SELECT COUNT(*) as total FROM users u ${whereClause}`,
                params
            );

            return {
                success: true,
                bannedUsers: rows,
                pagination: {
                    total: countRows[0].total,
                    limit: limit,
                    offset: offset,
                    hasMore: countRows[0].total > (offset + limit)
                }
            };

        } catch (error) {
            console.error('❌ Get banned users failed:', error.message);
            throw error;
        }
    }

    // Get ban statistics
    async getBanStatistics() {
        try {
            const pool = db_backoffice.getPool();
            
            const [stats] = await pool.execute(`
                SELECT 
                    COUNT(CASE WHEN is_active = 'banned' THEN 1 END) as total_banned,
                    COUNT(CASE WHEN is_active = 'banned' AND ban_expires_at IS NOT NULL AND ban_expires_at > NOW() THEN 1 END) as temporary_banned,
                    COUNT(CASE WHEN is_active = 'banned' AND (ban_expires_at IS NULL OR ban_expires_at <= NOW()) THEN 1 END) as permanent_banned,
                    COUNT(CASE WHEN is_active = '1' THEN 1 END) as active_users,
                    COUNT(CASE WHEN is_active = 'inactive' THEN 1 END) as inactive_users,
                    COUNT(*) as total_users
                FROM users
            `);

            const [recentBans] = await pool.execute(`
                SELECT COUNT(*) as recent_bans
                FROM user_bans 
                WHERE action = 'ban' AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
            `);

            const [recentUnbans] = await pool.execute(`
                SELECT COUNT(*) as recent_unbans
                FROM user_bans 
                WHERE action = 'unban' AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
            `);

            const [topBanReasons] = await pool.execute(`
                SELECT ban_reason, COUNT(*) as count
                FROM users 
                WHERE is_active = 'banned' AND ban_reason IS NOT NULL
                GROUP BY ban_reason
                ORDER BY count DESC
                LIMIT 10
            `);

            return {
                success: true,
                statistics: {
                    ...stats[0],
                    recent_bans_24h: recentBans[0].recent_bans,
                    recent_unbans_24h: recentUnbans[0].recent_unbans,
                    top_ban_reasons: topBanReasons
                }
            };

        } catch (error) {
            console.error('❌ Get ban statistics failed:', error.message);
            throw error;
        }
    }

   
}

// Create singleton instance
const userBanService = new UserBanService();

module.exports = userBanService;
