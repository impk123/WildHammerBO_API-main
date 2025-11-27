const db = require('./db_webgame');

class RoleInfoModel {
    // Get all roleinfo with pagination and filters
    static async findAll(page = 1, limit = 20, filters = {}) {
        let query = `
            SELECT * FROM roleinfo 
        `;
        
        const conditions = [];
        const params = [];
        
        if (filters.userId) {
            conditions.push('id LIKE ?');
            params.push(`%${filters.userId}%`);
        }
        
        if (filters.serverId) {
            conditions.push('serverid = ?');
            params.push(filters.serverId);
        }
        
        if (filters.roleLevel) {
            conditions.push('rolelevel = ?');
            params.push(filters.roleLevel);
        }
        
        if (filters.gameLevel) {
            conditions.push('gamelevels = ?');
            params.push(filters.gameLevel);
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

    // Get roleinfo by id
    static async getRoleInfoById(id) {
        let query = `
            SELECT * FROM roleinfo WHERE id = ?
        `;
        const [rows] = await db.getPool().execute(query, [id]);
        return rows.length > 0 ? rows[0] : null;
    }

    // Get roleinfo by user id (search in id field)
    static async getRoleInfoByUserId(userId) {
        let query = `
            SELECT * FROM roleinfo WHERE id LIKE ?
        `;
        const [rows] = await db.getPool().execute(query, [`%${userId}%`]);
        return rows;
    }

    // Update roleinfo
    static async updateRoleInfo(id, roleData, adminUsername) {
        const updateFields = [];
        const params = [];
        
        Object.keys(roleData).forEach(key => {
            if (roleData[key] !== undefined) {
                updateFields.push(`${key} = ?`);
                params.push(roleData[key]);
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
            UPDATE roleinfo 
            SET ${updateFields.join(', ')} 
            WHERE id = ?
        `;
        
        const [result] = await db.getPool().execute(query, params);
        
        if (result.affectedRows > 0) {
            return {
                success: true,
                message: 'Role info updated successfully',
                data: {
                    id: id,
                    updatedBy: adminUsername,
                    updatedAt: new Date().toISOString()
                }
            };
        } else {
            return {
                success: false,
                message: 'No role info found to update'
            };
        }
    }

    // Delete roleinfo
    static async deleteRoleInfo(id, adminUsername) {
        const query = `
            DELETE FROM roleinfo 
            WHERE id = ?
        `;
        
        const [result] = await db.getPool().execute(query, [id]);
        
        if (result.affectedRows > 0) {
            return {
                success: true,
                message: 'Role info deleted successfully',
                data: {
                    id: id,
                    deletedBy: adminUsername,
                    deletedAt: new Date().toISOString()
                }
            };
        } else {
            return {
                success: false,
                message: 'Role info not found'
            };
        }
    }

    // Create new roleinfo
    static async createRoleInfo(roleData, adminUsername) {
        const fields = Object.keys(roleData);
        const values = Object.values(roleData);
        const placeholders = fields.map(() => '?').join(', ');
        
        const query = `
            INSERT INTO roleinfo (${fields.join(', ')}) 
            VALUES (${placeholders})
        `;
        
        const [result] = await db.getPool().execute(query, values);
        
        if (result.affectedRows > 0) {
            return {
                success: true,
                message: 'Role info created successfully',
                data: {
                    id: result.insertId,
                    createdBy: adminUsername,
                    createdAt: new Date().toISOString()
                }
            };
        } else {
            return {
                success: false,
                message: 'Failed to create role info'
            };
        }
    }

    // Get roleinfo statistics
    static async getRoleInfoStats() {
        const queries = [
            'SELECT COUNT(*) as total FROM roleinfo',
            'SELECT COUNT(*) as active FROM roleinfo WHERE rolelevel > 0',
            'SELECT AVG(rolelevel) as avgLevel FROM roleinfo',
            'SELECT AVG(exp) as avgExp FROM roleinfo',
            'SELECT AVG(gamelevels) as avgGameLevel FROM roleinfo'
        ];
        
        const results = {};
        
        for (let i = 0; i < queries.length; i++) {
            const [rows] = await db.getPool().execute(queries[i]);
            const keys = ['total', 'active', 'avgLevel', 'avgExp', 'avgGameLevel'];
            results[keys[i]] = Object.values(rows[0])[0];
        }
        
        return results;
    }
}

module.exports = RoleInfoModel;
