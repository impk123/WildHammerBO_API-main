const db = require('./db_wgbackend');

class RoleHeroModel {
    // Get all rolehero with pagination and filters
    static async findAll(page = 1, limit = 20, filters = {}) {
        let query = `
            SELECT * FROM rolehero 
        `;
        
        const conditions = [];
        const params = [];
        
        if (filters.userId) {
            conditions.push('user_id = ?');
            params.push(filters.userId);
        }
        
        if (filters.serverId) {
            conditions.push('serverid = ?');
            params.push(filters.serverId);
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

    // Get rolehero by user id
    static async getRoleHeroByUserId(userId) {
        let query = `
            SELECT * FROM rolehero WHERE id = ? 
        `;
        const [rows] = await db.getPool().execute(query, [userId]);
        return rows;
    }

    // Get rolehero by id
    static async getRoleHeroById(id) {
        let query = `
            SELECT * FROM role WHERE id = ?
        `;
        const [rows] = await db.getPool().execute(query, [id]);
        return rows.length > 0 ? rows[0] : null;
    }

    // Update rolehero
    static async updateRoleHero(id, heroData, adminUsername) {
        const updateFields = [];
        const params = [];
        
        Object.keys(heroData).forEach(key => {
            if (heroData[key] !== undefined) {
                updateFields.push(`${key} = ?`);
                params.push(heroData[key]);
            }
        });
        
        if (updateFields.length === 0) {
            return {
                success: false,
                message: 'No fields to update'
            };
        }
        
        params.push(id);
        
        const query = `
            UPDATE rolehero 
            SET ${updateFields.join(', ')} 
            WHERE id = ?
        `;
        
        const [result] = await db.getPool().execute(query, params);
        
        if (result.affectedRows > 0) {
            return {
                success: true,
                message: 'Role hero updated successfully',
                data: {
                    id: id,
                    updatedBy: adminUsername,
                    updatedAt: new Date().toISOString()
                }
            };
        } else {
            return {
                success: false,
                message: 'No role hero found to update'
            };
        }
    }

    // Delete rolehero
    static async deleteRoleHero(id, adminUsername) {
        const query = `
            DELETE FROM rolehero 
            WHERE id = ?
        `;
        
        const [result] = await db.getPool().execute(query, [id]);
        
        if (result.affectedRows > 0) {
            return {
                success: true,
                message: 'Role hero deleted successfully',
                data: {
                    id: id,
                    deletedBy: adminUsername,
                    deletedAt: new Date().toISOString()
                }
            };
        } else {
            return {
                success: false,
                message: 'Role hero not found'
            };
        }
    }

    // Create new rolehero
    static async createRoleHero(heroData, adminUsername) {
        const fields = Object.keys(heroData);
        const values = Object.values(heroData);
        const placeholders = fields.map(() => '?').join(', ');
        
        const query = `
            INSERT INTO rolehero (${fields.join(', ')}) 
            VALUES (${placeholders})
        `;
        
        const [result] = await db.getPool().execute(query, values);
        
        if (result.affectedRows > 0) {
            return {
                success: true,
                message: 'Role hero created successfully',
                data: {
                    id: result.insertId,
                    createdBy: adminUsername,
                    createdAt: new Date().toISOString()
                }
            };
        } else {
            return {
                success: false,
                message: 'Failed to create role hero'
            };
        }
    }
}

module.exports = RoleHeroModel;
