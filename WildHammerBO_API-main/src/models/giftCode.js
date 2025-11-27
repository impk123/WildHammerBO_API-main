const db_backoffice = require('./db_backoffice');
const crypto = require('crypto');

class GiftCodeModel {
    // Create a new gift code
    static async create(giftCodeData) {
        const query = `
            INSERT INTO gift_codes (
                code, type, title, description, max_usage, max_usage_per_user,
                used_count, rewards, start_date, end_date, is_active, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const values = [
            giftCodeData.code,
            giftCodeData.type || 'single',
            giftCodeData.title || 'Gift Code',
            giftCodeData.description || null,
            giftCodeData.usageLimit || 1,
            giftCodeData.maxUsagePerUser || 1,
            0, // used_count starts at 0
            JSON.stringify(giftCodeData.rewards || {}),
            giftCodeData.startDate || null,
            giftCodeData.expiresAt || null,
            giftCodeData.isActive !== false ? 1 : 0,
            giftCodeData.createdBy
        ];
        
        const [result] = await db_backoffice.getPool().execute(query, values);
        return { id: result.insertId, ...giftCodeData };
    }

    // Find gift code by code
    static async findByCode(code) {
        const query = `
            SELECT * FROM gift_codes 
            WHERE code = ? AND is_active = 1
        `;
        const [rows] = await db_backoffice.getPool().execute(query, [code]);
        
        if (rows.length === 0) {
            return null;
        }

        const giftCode = rows[0];
        // Parse rewards JSON
        try {
            giftCode.rewards = JSON.parse(giftCode.rewards);
        } catch (error) {
            console.error('Error parsing rewards:', error);
            giftCode.rewards = {};
        }
        
        return giftCode;
    }

    // Get gift code by ID
    static async findById(id) {
        const query = `SELECT * FROM gift_codes WHERE id = ?`;
        const [rows] = await db_backoffice.getPool().execute(query, [id]);
        
        if (rows.length === 0) {
            return null;
        }

        const giftCode = rows[0];
        try {
            giftCode.rewards = JSON.parse(giftCode.rewards);
        } catch (error) {
            giftCode.rewards = {};
        }
        
        return giftCode;
    }

    // Update gift code usage count
    static async incrementUsageCount(id) {
        const query = `
            UPDATE gift_codes 
            SET used_count = COALESCE(used_count, 0) + 1
            WHERE id = ?
        `;
        await db_backoffice.getPool().execute(query, [id]);
    }

    // Check if gift code is expired
    static isExpired(giftCode) {
        if (!giftCode.end_date) {
            return false;
        }
        return new Date(giftCode.end_date) < new Date();
    }

    // Check if gift code usage limit is reached
    static isUsageLimitReached(giftCode) {
        if (!giftCode.max_usage) {
            return false;
        }
        return (giftCode.used_count || 0) >= giftCode.max_usage;
    }

    // Check if gift code is valid for redemption
    static async isValidForRedemption(giftCode, userId) {
        // Check if gift code is active
        if (!giftCode.is_active) {
            return { valid: false, reason: 'Gift code is inactive' };
        }

        // Check if expired
        if (this.isExpired(giftCode)) {
            return { valid: false, reason: 'Gift code has expired' };
        }

        // Check if usage limit reached
        if (this.isUsageLimitReached(giftCode)) {
            return { valid: false, reason: 'Gift code usage limit reached' };
        }

        // Check if user has already used this code (if userId provided)
        if (userId) {
            const userUsage = await this.getUserUsageCount(giftCode.id, userId);
            if (userUsage > 0) {
                return { valid: false, reason: 'User has already used this gift code' };
            }
        }

        return { valid: true };
    }

    // Get user usage count for a gift code
    static async getUserUsageCount(giftCodeId, userId) {
        const query = `
            SELECT COUNT(*) as count 
            FROM gift_code_redemptions 
            WHERE gift_code_id = ? AND user_id = ? AND redemption_status = 'success'
        `;
        const [rows] = await db_backoffice.getPool().execute(query, [giftCodeId, userId]);
        return rows[0].count;
    }

    // Get all gift codes with pagination
    static async findAll(page = 1, limit = 20, filters = {}) {
        // Ensure page and limit are integers
        page = parseInt(page) || 1;
        limit = parseInt(limit) || 20;
        let query = `
            SELECT gc.*, 
                   a.username as creator_name,
                   COALESCE(gc.used_count, 0) as total_redemptions
            FROM gift_codes gc
            LEFT JOIN admins a ON gc.created_by = a.id
            WHERE 1=1
        `;
        
        const queryParams = [];

        // Apply filters
        if (filters.type) {
            query += ` AND gc.type = ?`;
            queryParams.push(filters.type);
        }

        if (filters.isActive !== undefined) {
            query += ` AND gc.is_active = ?`;
            queryParams.push(filters.isActive ? 1 : 0);
        }

        if (filters.search) {
            query += ` AND gc.code LIKE ?`;
            queryParams.push(`%${filters.search}%`);
        }

        // Add ordering and pagination
        query += ` ORDER BY gc.created_at DESC LIMIT ${Number(limit)} OFFSET ${Number((page - 1) * limit)}`;

        const [rows] = await db_backoffice.getPool().execute(query, queryParams);
        
        // Parse rewards for each gift code
        rows.forEach(giftCode => {
            try {
                giftCode.rewards = JSON.parse(giftCode.rewards);
            } catch (error) {
                giftCode.rewards = {};
            }
        });

        return rows;
    }

    // Get total count for pagination
    static async getCount(filters = {}) {
        let query = `SELECT COUNT(*) as total FROM gift_codes WHERE 1=1`;
        const queryParams = [];

        if (filters.type) {
            query += ` AND type = ?`;
            queryParams.push(filters.type);
        }

        if (filters.isActive !== undefined) {
            query += ` AND is_active = ?`;
            queryParams.push(filters.isActive ? 1 : 0);
        }

        if (filters.search) {
            query += ` AND code LIKE ?`;
            queryParams.push(`%${filters.search}%`);
        }

        const [rows] = await db_backoffice.getPool().execute(query, queryParams);
        return rows[0].total;
    }

    // Deactivate gift code
    static async deactivate(id) {
        const query = `UPDATE gift_codes SET is_active = 0 WHERE id = ?`;
        await db_backoffice.getPool().execute(query, [id]);
    }

    // Activate gift code
    static async activate(id) {
        const query = `UPDATE gift_codes SET is_active = 1 WHERE id = ?`;
        await db_backoffice.getPool().execute(query, [id]);
    }

    // Generate unique gift code
    static async generateUniqueCode(prefix = 'GC', length = 8) {
        let code;
        let attempts = 0;
        const maxAttempts = 100;

        do {
            const randomPart = crypto.randomBytes(Math.ceil(length / 2))
                .toString('hex')
                .substring(0, length)
                .toUpperCase();
            
            code = `${prefix}${randomPart}`;
            
            // Check if code already exists
            const existing = await this.findByCode(code);
            if (!existing) {
                return code;
            }
            
            attempts++;
        } while (attempts < maxAttempts);

        throw new Error('Unable to generate unique gift code after maximum attempts');
    }

    // Get gift code statistics
    static async getStatistics() {
        const query = `
            SELECT 
                COUNT(*) as total_codes,
                COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_codes,
                COUNT(CASE WHEN end_date < NOW() THEN 1 END) as expired_codes,
                SUM(COALESCE(used_count, 0)) as total_redemptions,
                AVG(COALESCE(used_count, 0)) as avg_redemptions_per_code
            FROM gift_codes
        `;
        
        const [rows] = await db_backoffice.getPool().execute(query);
        return rows[0];
    }
}

module.exports = GiftCodeModel;
