const db_backoffice = require('./db_backoffice');

class PaymentPackage {
    // Get all active payment packages
    static async getAll(options = {}) {
        try {
            let query = `
                SELECT 
                    p.*,
                    a.username as created_by_username
                FROM payment_packages p
                LEFT JOIN admins a ON p.created_by = a.id
                WHERE p.is_active = 1
            `;
            
            const params = [];
            
            // Add filters
            if (options.category) {
                query += ` AND p.category = ?`;
                params.push(options.category);
            }
            
            if (options.package_type) {
                query += ` AND p.package_type = ?`;
                params.push(options.package_type);
            }
            
            if (options.is_popular) {
                query += ` AND p.is_popular = 1`;
            }
            
            if (options.min_price) {
                query += ` AND p.price_usd >= ?`;
                params.push(options.min_price);
            }
            
            if (options.max_price) {
                query += ` AND p.price_usd <= ?`;
                params.push(options.max_price);
            }
            
            // Add ordering
            query += ` ORDER BY p.sort_order ASC, p.is_popular DESC, p.price_usd ASC`;
            
            // Add pagination
            if (options.limit) {
                query += ` LIMIT ?`;
                params.push(parseInt(options.limit));
                
                if (options.offset) {
                    query += ` OFFSET ?`;
                    params.push(parseInt(options.offset));
                }
            }
            
            const [rows] = await db_backoffice.getPool().execute(query, params);
            
            // Parse JSON fields
            return rows.map(row => ({
                ...row,
                rewards: typeof row.rewards === 'string' ? JSON.parse(row.rewards) : row.rewards,
                platform_availability: row.platform_availability ? 
                    (typeof row.platform_availability === 'string' ? 
                        JSON.parse(row.platform_availability) : row.platform_availability) : null
            }));
        } catch (error) {
            console.error('Error getting payment packages:', error);
            throw error;
        }
    }
    
    // Get package by ID
    static async getById(packageId) {
        try {
            const [rows] = await db_backoffice.getPool().execute(`
                SELECT 
                    p.*,
                    a.username as created_by_username
                FROM payment_packages p
                LEFT JOIN admins a ON p.created_by = a.id
                WHERE p.package_id = ?
            `, [packageId]);
            
            if (rows.length === 0) {
                return null;
            }
            
            const packageData = rows[0];
            return {
                ...packageData,
                rewards: typeof packageData.rewards === 'string' ? 
                    JSON.parse(packageData.rewards) : packageData.rewards,
                platform_availability: packageData.platform_availability ? 
                    (typeof packageData.platform_availability === 'string' ? 
                        JSON.parse(packageData.platform_availability) : packageData.platform_availability) : null
            };
        } catch (error) {
            console.error('Error getting payment package by ID:', error);
            throw error;
        }
    }
    
    // Create new payment package
    static async create(packageData) {
        try {
            const {
                package_id, name, description, category, package_type,
                price_usd, price_local, currency, rewards, bonus_percentage,
                is_popular, is_limited_time, limited_end_date, max_purchases,
                min_level_required, platform_availability, is_active,
                sort_order, created_by
            } = packageData;
            
            const [result] = await db_backoffice.getPool().execute(`
                INSERT INTO payment_packages (
                    package_id, name, description, category, package_type,
                    price_usd, price_local, currency, rewards, bonus_percentage,
                    is_popular, is_limited_time, limited_end_date, max_purchases,
                    min_level_required, platform_availability, is_active,
                    sort_order, created_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                package_id, name, description, category, package_type,
                price_usd, price_local || null, currency || 'USD',
                typeof rewards === 'object' ? JSON.stringify(rewards) : rewards,
                bonus_percentage || 0, is_popular || 0, is_limited_time || 0,
                limited_end_date || null, max_purchases || null,
                min_level_required || 1,
                platform_availability ? JSON.stringify(platform_availability) : null,
                is_active !== undefined ? is_active : 1,
                sort_order || 0, created_by || null
            ]);
            
            return await this.getById(package_id);
        } catch (error) {
            console.error('Error creating payment package:', error);
            throw error;
        }
    }
    
    // Update payment package
    static async update(packageId, updateData) {
        try {
            const updates = [];
            const params = [];
            
            // Build dynamic update query
            Object.keys(updateData).forEach(key => {
                if (updateData[key] !== undefined && key !== 'package_id') {
                    updates.push(`${key} = ?`);
                    
                    if (key === 'rewards' || key === 'platform_availability') {
                        params.push(typeof updateData[key] === 'object' ? 
                            JSON.stringify(updateData[key]) : updateData[key]);
                    } else {
                        params.push(updateData[key]);
                    }
                }
            });
            
            if (updates.length === 0) {
                throw new Error('No valid fields to update');
            }
            
            params.push(packageId);
            
            const [result] = await db_backoffice.getPool().execute(`
                UPDATE payment_packages 
                SET ${updates.join(', ')}, updated_at = NOW()
                WHERE package_id = ?
            `, params);
            
            if (result.affectedRows === 0) {
                throw new Error('Payment package not found');
            }
            
            return await this.getById(packageId);
        } catch (error) {
            console.error('Error updating payment package:', error);
            throw error;
        }
    }
    
    // Delete (deactivate) payment package
    static async delete(packageId) {
        try {
            const [result] = await db_backoffice.getPool().execute(`
                UPDATE payment_packages 
                SET is_active = 0, updated_at = NOW()
                WHERE package_id = ?
            `, [packageId]);
            
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error deleting payment package:', error);
            throw error;
        }
    }
    
    // Get popular packages
    static async getPopular(limit = 5) {
        try {
            const [rows] = await db_backoffice.getPool().execute(`
                SELECT * FROM payment_packages 
                WHERE is_active = 1 AND is_popular = 1
                ORDER BY sort_order ASC, price_usd ASC
                LIMIT ?
            `, [limit]);
            
            return rows.map(row => ({
                ...row,
                rewards: typeof row.rewards === 'string' ? JSON.parse(row.rewards) : row.rewards,
                platform_availability: row.platform_availability ? 
                    (typeof row.platform_availability === 'string' ? 
                        JSON.parse(row.platform_availability) : row.platform_availability) : null
            }));
        } catch (error) {
            console.error('Error getting popular packages:', error);
            throw error;
        }
    }
    
    // Get packages by category
    static async getByCategory(category) {
        try {
            const [rows] = await db_backoffice.getPool().execute(`
                SELECT * FROM payment_packages 
                WHERE is_active = 1 AND category = ?
                ORDER BY sort_order ASC, price_usd ASC
            `, [category]);
            
            return rows.map(row => ({
                ...row,
                rewards: typeof row.rewards === 'string' ? JSON.parse(row.rewards) : row.rewards,
                platform_availability: row.platform_availability ? 
                    (typeof row.platform_availability === 'string' ? 
                        JSON.parse(row.platform_availability) : row.platform_availability) : null
            }));
        } catch (error) {
            console.error('Error getting packages by category:', error);
            throw error;
        }
    }
    
    // Check if package is available for user
    static async isAvailableForUser(packageId, userId) {
        try {
            const packageData = await this.getById(packageId);
            if (!packageData || !packageData.is_active) {
                return { available: false, reason: 'Package not found or inactive' };
            }
            
            // Check limited time
            if (packageData.is_limited_time && packageData.limited_end_date) {
                const now = new Date();
                const endDate = new Date(packageData.limited_end_date);
                if (now > endDate) {
                    return { available: false, reason: 'Limited time offer expired' };
                }
            }
            
            // Check max purchases per user
            if (packageData.max_purchases) {
                const [purchaseRows] = await db_backoffice.getPool().execute(`
                    SELECT purchase_count FROM payment_user_purchases 
                    WHERE user_id = ? AND package_id = ?
                `, [userId, packageId]);
                
                const currentPurchases = purchaseRows.length > 0 ? purchaseRows[0].purchase_count : 0;
                if (currentPurchases >= packageData.max_purchases) {
                    return { available: false, reason: 'Maximum purchases reached' };
                }
            }
            
            // Check user level requirement
            if (packageData.min_level_required > 1) {
                const [userRows] = await db_backoffice.getPool().execute(`
                    SELECT level FROM users WHERE id = ?
                `, [userId]);
                
                if (userRows.length === 0) {
                    return { available: false, reason: 'User not found' };
                }
                
                const userLevel = userRows[0].level || 1;
                if (userLevel < packageData.min_level_required) {
                    return { available: false, reason: `Requires level ${packageData.min_level_required}` };
                }
            }
            
            return { available: true, package: packageData };
        } catch (error) {
            console.error('Error checking package availability:', error);
            throw error;
        }
    }
    
    // Get package statistics
    static async getStatistics() {
        try {
            const [stats] = await db_backoffice.getPool().execute(`
                SELECT 
                    COUNT(*) as total_packages,
                    COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_packages,
                    COUNT(CASE WHEN is_popular = 1 THEN 1 END) as popular_packages,
                    COUNT(CASE WHEN is_limited_time = 1 THEN 1 END) as limited_packages,
                    AVG(price_usd) as average_price,
                    MIN(price_usd) as min_price,
                    MAX(price_usd) as max_price
                FROM payment_packages
            `);
            
            return stats[0];
        } catch (error) {
            console.error('Error getting package statistics:', error);
            throw error;
        }
    }
}

module.exports = PaymentPackage;
