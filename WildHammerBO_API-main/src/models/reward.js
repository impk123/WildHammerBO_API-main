const db = require('./db_backoffice');

class Reward {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.image_url = data.image_url;
        this.token_cost = data.token_cost;
        this.description = data.description;
        this.is_active = data.is_active;
        this.stock_quantity = data.stock_quantity;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    // Get all active rewards
    static async getAllActive() {
        try {
            const [rows] = await db.execute(
                'SELECT * FROM rewards WHERE is_active = TRUE ORDER BY created_at DESC'
            );
            return rows.map(row => new Reward(row));
        } catch (error) {
            console.error('Error getting active rewards:', error);
            throw error;
        }
    }

    // Get all rewards (admin)
    static async getAll() {
        try {
            const [rows] = await db.execute(
                'SELECT * FROM rewards ORDER BY created_at DESC'
            );
            return rows.map(row => new Reward(row));
        } catch (error) {
            console.error('Error getting all rewards:', error);
            throw error;
        }
    }

    // Get reward by ID
    static async getById(id) {
        try {
            const [rows] = await db.execute(
                'SELECT * FROM rewards WHERE id = ?',
                [id]
            );
            return rows.length > 0 ? new Reward(rows[0]) : null;
        } catch (error) {
            console.error('Error getting reward by ID:', error);
            throw error;
        }
    }

    // Create new reward
    static async create(rewardData) {
        try {
            const { name, image_url, token_cost, description, stock_quantity } = rewardData;
            const [result] = await db.execute(
                'INSERT INTO rewards (name, image_url, token_cost, description, stock_quantity) VALUES (?, ?, ?, ?, ?)',
                [name, image_url, token_cost, description, stock_quantity]
            );
            return result.insertId;
        } catch (error) {
            console.error('Error creating reward:', error);
            throw error;
        }
    }

    // Update reward
    async update(updateData) {
        try {
            const { name, image_url, token_cost, description, is_active, stock_quantity } = updateData;
            await db.execute(
                'UPDATE rewards SET name = ?, image_url = ?, token_cost = ?, description = ?, is_active = ?, stock_quantity = ? WHERE id = ?',
                [name, image_url, token_cost, description, is_active, stock_quantity, this.id]
            );
            return true;
        } catch (error) {
            console.error('Error updating reward:', error);
            throw error;
        }
    }

    // Delete reward
    async delete() {
        try {
            await db.execute('DELETE FROM rewards WHERE id = ?', [this.id]);
            return true;
        } catch (error) {
            console.error('Error deleting reward:', error);
            throw error;
        }
    }

    // Check if reward is available for redemption
    async isAvailable() {
        if (!this.is_active) return false;
        if (this.stock_quantity === -1) return true; // Unlimited stock
        if (this.stock_quantity > 0) return true;
        return false;
    }

    // Decrease stock quantity
    async decreaseStock() {
        if (this.stock_quantity === -1) return true; // Unlimited stock
        if (this.stock_quantity > 0) {
            await db.execute(
                'UPDATE rewards SET stock_quantity = stock_quantity - 1 WHERE id = ?',
                [this.id]
            );
            this.stock_quantity -= 1;
            return true;
        }
        return false;
    }
}

module.exports = Reward;
