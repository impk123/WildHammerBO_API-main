const db = require('./db_webgame');
const crypto = require('crypto');

class gameEquipModel {
    // Get all equip with pagination and filters
    static async findAll(page = 1, limit = 20, filters = {}) {
        let query = `
            SELECT * FROM roleequip 
        `;
        
        const conditions = [];
        const params = [];
        
        if (filters.userId) {
            conditions.push('user_id = ?');
            params.push(filters.userId);
        }
        
        if (filters.equipType) {
            conditions.push('equip_type = ?');
            params.push(filters.equipType);
        }
        
        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }
        
        // Add pagination
        const offset = (page - 1) * limit;
        query += ` LIMIT ${limit} OFFSET ${offset}`;
        
        const [rows] = await db.getPool().execute(query, params);
        return rows;
    }

    // Get equip by user id
    static async getEquipByUserId(userId) {
        let query = `
            SELECT * FROM roleequip WHERE id = ?
        `;
        const [rows] = await db.getPool().execute(query, [userId]);
        return rows;
    }

    // Update equip
    static async updateEquip(userId, equipData, adminUsername) {
        const updateFields = [];
        const params = [];
        
        Object.keys(equipData).forEach(key => {
            if (equipData[key] !== undefined) {
                updateFields.push(`${key} = ?`);
                params.push(equipData[key]);
            }
        });
        
        if (updateFields.length === 0) {
            return {
                success: false,
                message: 'No fields to update'
            };
        }
        
        params.push(userId);
        
        const query = `
            UPDATE roleequip 
            SET ${updateFields.join(', ')} 
            WHERE user_id = ?
        `;
        
        const [result] = await db.getPool().execute(query, params);
        
        if (result.affectedRows > 0) {
            return {
                success: true,
                message: 'Equipment updated successfully',
                data: {
                    userId: parseInt(userId),
                    updatedBy: adminUsername,
                    updatedAt: new Date().toISOString()
                }
            };
        } else {
            return {
                success: false,
                message: 'No equipment found to update'
            };
        }
    }

    // Delete equip
    static async deleteEquip(userId, equipId, adminUsername) {
        const query = `
            DELETE FROM roleequip 
            WHERE user_id = ? AND id = ?
        `;
        
        const [result] = await db.getPool().execute(query, [userId, equipId]);
        
        if (result.affectedRows > 0) {
            return {
                success: true,
                message: 'Equipment deleted successfully',
                data: {
                    userId: parseInt(userId),
                    equipId: parseInt(equipId),
                    deletedBy: adminUsername,
                    deletedAt: new Date().toISOString()
                }
            };
        } else {
            return {
                success: false,
                message: 'Equipment not found'
            };
        }
    }
}

module.exports = gameEquipModel;
