const db_backoffice = require('./db_backoffice');

class PrizeSetting {
    // Get prize setting by ID and serverid (default ID is 1)
    static async getByServerId(serverid) {
        try {
            const [rows] = await db_backoffice.getPool().execute(`
                SELECT * FROM prize_setting WHERE serverid = ?
            `, [serverid]);
            
            if (rows.length === 0) {
                return null;
            }
            
            return rows[0];
        } catch (error) {
            console.error('Error getting prize setting by ServerID:', error);
            throw error;
        }
    }
    
    // Update all prize setting values for a specific ID and serverid
    static async updateAll(serverid, updateData) {
        try {
            const {
                initial_prize,
                tota_buytoken,
                percent_addon,
                addon_prize
            } = updateData;
            
            const [result] = await db_backoffice.getPool().execute(`
                UPDATE prize_setting 
                SET 
                    initial_prize = ?,
                    tota_buytoken = ?,
                    percent_addon = ?,
                    addon_prize = ?
                WHERE serverid = ?
            `, [
                initial_prize,
                tota_buytoken,
                percent_addon,
                addon_prize,                
                serverid
            ]);
            
            if (result.affectedRows === 0) {
                throw new Error('Prize setting not found');
            }
            
            return await this.getByServerId(serverid);
        } catch (error) {
            console.error('Error updating prize setting:', error);
            throw error;
        }
    }
    
    // Increase total_buytoken by a specific amount
    static async  increaseTotalBuytoken(serverid, increaseAmount) {
        try {
            const [result] = await db_backoffice.getPool().execute(`
                UPDATE prize_setting 
                SET tota_buytoken = tota_buytoken + ?,                
                addon_prize = addon_prize + ((percent_addon/100) * ?)
                WHERE  serverid = ?
            `, [increaseAmount, increaseAmount, serverid]);
            
            if (result.affectedRows === 0) {
                throw new Error('Prize setting not found');
            }
            
            return await this.getByServerId(serverid);
        } catch (error) {
            console.error('Error increasing total buytoken:', error);
            throw error;
        }
    }
    
    // Get all prize settings
    static async getAll(serverid = null) {
        try {
            let query = `SELECT * FROM prize_setting`;
            const params = [];
            
            if (serverid !== null) {
                query += ` WHERE serverid = ?`;
                params.push(serverid);
            }
            
            query += ` ORDER BY serverid ASC, id ASC`;
            
            const [rows] = await db_backoffice.getPool().execute(query, params);
            return rows;
        } catch (error) {
            console.error('Error getting all prize settings:', error);
            throw error;
        }
    }
    
    // Create new prize setting
    static async create(prizeData) {
        try {
            const {
                id,
                serverid,
                initial_prize,
                tota_buytoken,
                percent_addon,
                addon_prize
            } = prizeData;
            
            const [result] = await db_backoffice.getPool().execute(`
                INSERT INTO prize_setting (
                    id, serverid, initial_prize, tota_buytoken, percent_addon, addon_prize
                ) VALUES (?, ?, ?, ?, ?, ?)
            `, [
                id,
                serverid,
                initial_prize,
                tota_buytoken,
                percent_addon,
                addon_prize
            ]);
            
            return await this.getByServerId(serverid);
        } catch (error) {
            console.error('Error creating prize setting:', error);
            throw error;
        }
    }
}

module.exports = PrizeSetting;
