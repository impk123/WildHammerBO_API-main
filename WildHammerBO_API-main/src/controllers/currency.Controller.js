const db_backoffice = require('../models/db_backoffice');
const { validationResult } = require('express-validator');

/**
 * Get user's current currency information
 * GET /api/users/:userId/currency
 */
const getUserCurrency = async (req, res) => {
    try {
        const { userId } = req.params;

        // Validate user ID
        const userIdNum = parseInt(userId, 10);
        if (isNaN(userIdNum) || userIdNum <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID'
            });
        }

        // Get user currency information
        const query = `
            SELECT id, username, email, display_name, level, experience, coins, gems, 
                   last_login, created_at, updated_at
            FROM users 
            WHERE id = ? AND is_active = 1
        `;

        const [users] = await db_backoffice.execute(query, [userIdNum]);

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found or inactive'
            });
        }

        const user = users[0];

        res.json({
            success: true,
            data: {
                user_id: user.id,
                username: user.username,
                email: user.email,
                display_name: user.display_name,
                level: user.level,
                experience: user.experience,
                currency: {
                    coins: user.coins,
                    gems: user.gems
                },
                last_login: user.last_login,
                created_at: user.created_at,
                updated_at: user.updated_at
            }
        });

    } catch (error) {
        console.error('Error getting user currency:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get user currency information'
        });
    }
};

/**
 * Update user's currency (Admin only)
 * PATCH /api/users/:userId/currency
 */
const updateUserCurrency = async (req, res) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { userId } = req.params;
        const { action, amount, currency_type, reason } = req.body;

        // Validate user ID
        const userIdNum = parseInt(userId, 10);
        if (isNaN(userIdNum) || userIdNum <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID'
            });
        }

        // Validate currency type
        if (!['coins', 'gems'].includes(currency_type)) {
            return res.status(400).json({
                success: false,
                message: 'Currency type must be "coins" or "gems"'
            });
        }

        // Validate action
        if (!['add', 'subtract', 'set'].includes(action)) {
            return res.status(400).json({
                success: false,
                message: 'Action must be "add", "subtract", or "set"'
            });
        }

        // Validate amount
        const amountNum = parseInt(amount, 10);
        if (isNaN(amountNum) || amountNum < 0) {
            return res.status(400).json({
                success: false,
                message: 'Amount must be a non-negative number'
            });
        }

        // Get current user data
        const getUserQuery = `
            SELECT id, username, coins, gems, is_active
            FROM users 
            WHERE id = ?
        `;
        const [users] = await db_backoffice.execute(getUserQuery, [userIdNum]);

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const user = users[0];
        if (!user.is_active) {
            return res.status(400).json({
                success: false,
                message: 'Cannot update currency for inactive user'
            });
        }

        // Calculate new currency value
        let currentValue = currency_type === 'coins' ? user.coins : user.gems;
        let newValue;

        switch (action) {
            case 'add':
                newValue = currentValue + amountNum;
                break;
            case 'subtract':
                newValue = Math.max(0, currentValue - amountNum); // Prevent negative values
                break;
            case 'set':
                newValue = amountNum;
                break;
        }

        // Update user currency
        const updateQuery = `
            UPDATE users 
            SET ${currency_type} = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `;
        
        await db_backoffice.execute(updateQuery, [newValue, userIdNum]);

        // Log the currency change
        const logQuery = `
            INSERT INTO currency_logs 
            (user_id, admin_id, currency_type, action, old_value, new_value, amount, reason, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `;

        try {
            await db_backoffice.execute(logQuery, [
                userIdNum,
                req.admin.id,
                currency_type,
                action,
                currentValue,
                newValue,
                amountNum,
                reason || 'Admin currency update'
            ]);
        } catch (logError) {
            // Log error but don't fail the request
            console.warn('Failed to log currency change:', logError);
        }

        res.json({
            success: true,
            message: `User ${currency_type} updated successfully`,
            data: {
                user_id: userIdNum,
                username: user.username,
                currency_type,
                action,
                old_value: currentValue,
                new_value: newValue,
                amount: amountNum,
                reason: reason || 'Admin currency update',
                updated_by: req.admin.username,
                updated_at: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Error updating user currency:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update user currency'
        });
    }
};

/**
 * Get currency update history for a user
 * GET /api/users/:userId/currency/history
 */
const getCurrencyHistory = async (req, res) => {
    try {
        const { userId } = req.params;
        const { limit = 50, offset = 0, currency_type } = req.query;

        // Validate user ID
        const userIdNum = parseInt(userId, 10);
        if (isNaN(userIdNum) || userIdNum <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID'
            });
        }

        // Build query with optional currency type filter
        let historyQuery = `
            SELECT cl.*, a.username as admin_username
            FROM currency_logs cl
            LEFT JOIN admins a ON cl.admin_id = a.id
            WHERE cl.user_id = ?
        `;
        
        const queryParams = [userIdNum];

        if (currency_type && ['coins', 'gems'].includes(currency_type)) {
            historyQuery += ' AND cl.currency_type = ?';
            queryParams.push(currency_type);
        }

        historyQuery += ' ORDER BY cl.created_at DESC LIMIT ? OFFSET ?';
        queryParams.push(parseInt(limit, 10), parseInt(offset, 10));

        const [history] = await db_backoffice.execute(historyQuery, queryParams);

        // Get user info
        const userQuery = 'SELECT username, display_name FROM users WHERE id = ?';
        const [users] = await db_backoffice.execute(userQuery, [userIdNum]);
        
        res.json({
            success: true,
            data: {
                user: users.length > 0 ? users[0] : null,
                history: history.map(log => ({
                    id: log.id,
                    currency_type: log.currency_type,
                    action: log.action,
                    old_value: log.old_value,
                    new_value: log.new_value,
                    amount: log.amount,
                    reason: log.reason,
                    admin_username: log.admin_username,
                    created_at: log.created_at
                })),
                pagination: {
                    limit: parseInt(limit, 10),
                    offset: parseInt(offset, 10),
                    total: history.length
                }
            }
        });

    } catch (error) {
        console.error('Error getting currency history:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get currency history'
        });
    }
};

/**
 * Search users by username or email for currency management
 * GET /api/users/search
 */
const searchUsers = async (req, res) => {
    try {
        const { q, limit = 20, offset = 0 } = req.query;

        if (!q || q.length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Search query must be at least 2 characters'
            });
        }

        const searchQuery = `
            SELECT id, username, email, display_name, level, coins, gems, 
                   is_active, last_login, created_at
            FROM users 
            WHERE (username LIKE ? OR email LIKE ? OR display_name LIKE ?)
            ORDER BY is_active DESC, last_login DESC
            LIMIT ? OFFSET ?
        `;

        const searchTerm = `%${q}%`;
        const [users] = await db_backoffice.execute(searchQuery, [
            searchTerm, searchTerm, searchTerm,
            parseInt(limit, 10), parseInt(offset, 10)
        ]);

        res.json({
            success: true,
            data: {
                users: users.map(user => ({
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    display_name: user.display_name,
                    level: user.level,
                    currency: {
                        coins: user.coins,
                        gems: user.gems
                    },
                    is_active: user.is_active,
                    last_login: user.last_login,
                    created_at: user.created_at
                })),
                pagination: {
                    limit: parseInt(limit, 10),
                    offset: parseInt(offset, 10),
                    search_query: q
                }
            }
        });

    } catch (error) {
        console.error('Error searching users:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to search users'
        });
    }
};

/**
 * Get currency statistics and summary
 * GET /api/users/currency/statistics
 */
const getCurrencyStatistics = async (req, res) => {
    try {
        // Get total currency in circulation
        const totalQuery = `
            SELECT 
                COUNT(*) as total_users,
                COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_users,
                SUM(coins) as total_coins,
                SUM(gems) as total_gems,
                AVG(coins) as avg_coins_per_user,
                AVG(gems) as avg_gems_per_user,
                MAX(coins) as max_coins,
                MAX(gems) as max_gems
            FROM users
        `;

        const [totals] = await db_backoffice.execute(totalQuery);

        // Get recent currency changes
        const recentChangesQuery = `
            SELECT cl.*, u.username, a.username as admin_username
            FROM currency_logs cl
            LEFT JOIN users u ON cl.user_id = u.id
            LEFT JOIN admins a ON cl.admin_id = a.id
            ORDER BY cl.created_at DESC
            LIMIT 10
        `;

        const [recentChanges] = await db_backoffice.execute(recentChangesQuery);

        // Get currency distribution
        const distributionQuery = `
            SELECT 
                'coins' as currency_type,
                COUNT(CASE WHEN coins = 0 THEN 1 END) as zero_balance,
                COUNT(CASE WHEN coins BETWEEN 1 AND 1000 THEN 1 END) as low_balance,
                COUNT(CASE WHEN coins BETWEEN 1001 AND 10000 THEN 1 END) as medium_balance,
                COUNT(CASE WHEN coins > 10000 THEN 1 END) as high_balance
            FROM users WHERE is_active = 1
            UNION ALL
            SELECT 
                'gems' as currency_type,
                COUNT(CASE WHEN gems = 0 THEN 1 END) as zero_balance,
                COUNT(CASE WHEN gems BETWEEN 1 AND 100 THEN 1 END) as low_balance,
                COUNT(CASE WHEN gems BETWEEN 101 AND 1000 THEN 1 END) as medium_balance,
                COUNT(CASE WHEN gems > 1000 THEN 1 END) as high_balance
            FROM users WHERE is_active = 1
        `;

        const [distribution] = await db_backoffice.execute(distributionQuery);

        const stats = totals[0];

        res.json({
            success: true,
            data: {
                summary: {
                    total_users: stats.total_users,
                    active_users: stats.active_users,
                    total_coins_in_circulation: stats.total_coins || 0,
                    total_gems_in_circulation: stats.total_gems || 0,
                    average_coins_per_user: Math.round(stats.avg_coins_per_user || 0),
                    average_gems_per_user: Math.round(stats.avg_gems_per_user || 0),
                    highest_coins: stats.max_coins || 0,
                    highest_gems: stats.max_gems || 0
                },
                distribution: distribution.reduce((acc, row) => {
                    acc[row.currency_type] = {
                        zero_balance: row.zero_balance,
                        low_balance: row.low_balance,
                        medium_balance: row.medium_balance,
                        high_balance: row.high_balance
                    };
                    return acc;
                }, {}),
                recent_changes: recentChanges.map(change => ({
                    id: change.id,
                    username: change.username,
                    admin_username: change.admin_username,
                    currency_type: change.currency_type,
                    action: change.action,
                    old_value: change.old_value,
                    new_value: change.new_value,
                    amount: change.amount,
                    reason: change.reason,
                    created_at: change.created_at
                }))
            }
        });

    } catch (error) {
        console.error('Error getting currency statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get currency statistics'
        });
    }
};

module.exports = {
    getUserCurrency,
    updateUserCurrency,
    getCurrencyHistory,
    searchUsers,
    getCurrencyStatistics
};
