const db = require('./db_backoffice');

class RewardRedemption {
    constructor(data) {
        this.id = data.id;
        this.reward_id = data.reward_id;
        this.user_id = data.user_id;
        this.server_id = data.server_id;
        this.token_cost = data.token_cost;
        this.real_money_before = data.real_money_before;
        this.real_money_after = data.real_money_after;
        this.shipping_address = data.shipping_address;
        this.email = data.email;
        this.status = data.status;
        this.notes = data.notes;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    // Create new redemption
    static async create(redemptionData) {
        try {
            const { 
                reward_id, 
                user_id, 
                server_id, 
                token_cost, 
                real_money_before, 
                real_money_after, 
                shipping_address, 
                email, 
                notes 
            } = redemptionData;
            
            const [result] = await db.execute(
                `INSERT INTO reward_redemptions 
                (reward_id, user_id, server_id, token_cost, real_money_before, real_money_after, shipping_address, email, notes) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [reward_id, user_id, server_id, token_cost, real_money_before, real_money_after, shipping_address, email, notes]
            );
            return result.insertId;
        } catch (error) {
            console.error('Error creating reward redemption:', error);
            throw error;
        }
    }

    // Get redemption by ID
    static async getById(id) {
        try {
            const [rows] = await db.execute(
                'SELECT * FROM reward_redemptions WHERE id = ?',
                [id]
            );
            return rows.length > 0 ? new RewardRedemption(rows[0]) : null;
        } catch (error) {
            console.error('Error getting redemption by ID:', error);
            throw error;
        }
    }

    // Get redemptions by user
    static async getByUser(userId, serverId) {
        try {
            const [rows] = await db.execute(
                `SELECT rr.*, r.name as reward_name, r.image_url as reward_image 
                FROM reward_redemptions rr 
                JOIN rewards r ON rr.reward_id = r.id 
                WHERE rr.user_id = ? AND rr.server_id = ? 
                ORDER BY rr.created_at DESC`,
                [userId, serverId]
            );
            return rows.map(row => new RewardRedemption(row));
        } catch (error) {
            console.error('Error getting redemptions by user:', error);
            throw error;
        }
    }

    // Get all redemptions (admin)
    static async getAll(limit = 50, offset = 0) {
        try {
            const [rows] = await db.execute(
                `SELECT rr.*, r.name as reward_name, r.image_url as reward_image 
                FROM reward_redemptions rr 
                JOIN rewards r ON rr.reward_id = r.id 
                ORDER BY rr.created_at DESC 
                LIMIT ? OFFSET ?`,
                [limit, offset]
            );
            return rows.map(row => new RewardRedemption(row));
        } catch (error) {
            console.error('Error getting all redemptions:', error);
            throw error;
        }
    }

    // Update redemption status
    async updateStatus(status, notes = null) {
        try {
            await db.execute(
                'UPDATE reward_redemptions SET status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [status, notes, this.id]
            );
            this.status = status;
            if (notes) this.notes = notes;
            return true;
        } catch (error) {
            console.error('Error updating redemption status:', error);
            throw error;
        }
    }

    // Get redemption statistics
    static async getStatistics() {
        try {
            const [rows] = await db.execute(`
                SELECT 
                    COUNT(*) as total_redemptions,
                    SUM(token_cost) as total_tokens_used,
                    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
                    COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_count,
                    COUNT(CASE WHEN status = 'shipped' THEN 1 END) as shipped_count,
                    COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_count,
                    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_count
                FROM reward_redemptions
            `);
            return rows[0];
        } catch (error) {
            console.error('Error getting redemption statistics:', error);
            throw error;
        }
    }
}

module.exports = RewardRedemption;
