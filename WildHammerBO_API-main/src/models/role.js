const db = require('./db_webgame');

class RoleModel {
    // Get all roleinfo with pagination and filters
    static async findAll(page = 1, limit = 20, filters = {}) {
        let query = `
            SELECT * FROM role 
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
    static async getRoleById(id) {
        let query = `
            SELECT * FROM role WHERE id = ?
        `;
        const [rows] = await db.getPool().execute(query, [id]);
        return rows.length > 0 ? rows[0] : null;
    }

    // Get roleinfo by user id (search in id field)
    static async getRoleByUserId(userId) {
        let query = `
            SELECT * FROM role WHERE id LIKE ?
        `;
        const [rows] = await db.getPool().execute(query, [`%${userId}%`]);
        return rows;
    }

    // Update roleinfo
    static async updateRole(id, roleData, adminUsername) {
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
            UPDATE role 
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
    static async deleteRole(id, adminUsername) {
        const query = `
            DELETE FROM role 
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
    static async createRole(roleData, adminUsername) {
        const fields = Object.keys(roleData);
        const values = Object.values(roleData);
        const placeholders = fields.map(() => '?').join(', ');
        
        const query = `
            INSERT INTO role (${fields.join(', ')}) 
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
    static async getRoleStats() {
        const queries = [
            'SELECT COUNT(*) as total FROM role',
            'SELECT COUNT(*) as active FROM role WHERE rolelevel > 0',
            'SELECT AVG(rolelevel) as avgLevel FROM role',
            'SELECT AVG(exp) as avgExp FROM role',
            'SELECT AVG(gamelevels) as avgGameLevel FROM role'
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

module.exports = RoleModel;
