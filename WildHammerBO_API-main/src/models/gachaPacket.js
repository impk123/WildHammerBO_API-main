const db = require('./db_backoffice');

class GachaPacketModel {
    // Get all gacha packets with pagination and filters
    static async findAll(page = 1, limit = 20, filters = {}) {
        let query = `
            SELECT * FROM gacha_packets 
        `;
        
        const conditions = [];
        const params = [];
        
        if (filters.is_active !== undefined) {
            conditions.push('is_active = ?');
            params.push(filters.is_active);
        }
        
        if (filters.is_equipment !== undefined) {
            conditions.push('is_equipment = ?');
            params.push(filters.is_equipment);
        }
        
        if (filters.name) {
            conditions.push('name LIKE ?');
            params.push(`%${filters.name}%`);
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

    // Get gacha packet by id
    static async findById(id) {
        const query = `
            SELECT * FROM gacha_packets WHERE id = ?
        `;
        const [rows] = await db.getPool().execute(query, [id]);
        return rows.length > 0 ? rows[0] : null;
    }

    // Create new gacha packet
    static async create(packetData) {
        const fields = Object.keys(packetData);
        const values = Object.values(packetData);
        const placeholders = fields.map(() => '?').join(', ');
        
        const query = `
            INSERT INTO gacha_packets (${fields.join(', ')}) 
            VALUES (${placeholders})
        `;
        
        const [result] = await db.getPool().execute(query, values);
        
        if (result.affectedRows > 0) {
            return {
                success: true,
                message: 'Gacha packet created successfully',
                data: {
                    id: result.insertId,
                    createdAt: new Date().toISOString()
                }
            };
        } else {
            return {
                success: false,
                message: 'Failed to create gacha packet'
            };
        }
    }

    // Update gacha packet
    static async update(id, packetData) {
        const updateFields = [];
        const params = [];
        
        Object.keys(packetData).forEach(key => {
            if (packetData[key] !== undefined) {
                updateFields.push(`${key} = ?`);
                params.push(packetData[key]);
            }
        });
        
        if (updateFields.length === 0) {
            return {
                success: false,
                message: 'No fields to update'
            };
        }
        
        // Add updated_at
        updateFields.push('updated_at = ?');
        params.push(new Date());
        params.push(id);
        
        const query = `
            UPDATE gacha_packets 
            SET ${updateFields.join(', ')} 
            WHERE id = ?
        `;
        
        const [result] = await db.getPool().execute(query, params);
        
        if (result.affectedRows > 0) {
            return {
                success: true,
                message: 'Gacha packet updated successfully',
                data: {
                    id: id,
                    updatedAt: new Date().toISOString()
                }
            };
        } else {
            return {
                success: false,
                message: 'Gacha packet not found or no changes made'
            };
        }
    }

    // Delete gacha packet
    static async delete(id) {
        const query = `
            DELETE FROM gacha_packets WHERE id = ?
        `;
        
        const [result] = await db.getPool().execute(query, [id]);
        
        if (result.affectedRows > 0) {
            return {
                success: true,
                message: 'Gacha packet deleted successfully',
                data: {
                    id: id,
                    deletedAt: new Date().toISOString()
                }
            };
        } else {
            return {
                success: false,
                message: 'Gacha packet not found'
            };
        }
    }

    // Get active gacha packets for game
    static async getActivePackets() {
        const query = `
            SELECT * FROM gacha_packets 
            WHERE is_active = 1 
            ORDER BY prob_rate DESC
        `;
        
        const [rows] = await db.getPool().execute(query);
        return rows;
    }

    // Get gacha packet statistics
    static async getStatistics() {
        const query = `
            SELECT 
                COUNT(*) as total_packets,
                SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_packets,
                SUM(CASE WHEN is_equipment = 1 THEN 1 ELSE 0 END) as equipment_packets,
                AVG(prob_rate) as average_prob_rate,
                SUM(CASE WHEN is_active = 1 THEN prob_rate ELSE 0 END) as sum_prob_rate
            FROM gacha_packets
        `;
        
        const [rows] = await db.getPool().execute(query);
        return rows.length > 0 ? rows[0] : null;
    }

    static async getGachaCost() {
        const query = `
            SELECT use_token 
            FROM gacha_cost 
            WHERE id = 1 
        `;
        
        const [rows] = await db.getPool().execute(query);
        return rows.length > 0 ? rows[0]['use_token'] : null;
    }

    static async getGachaHistory(roleid, page = 1, limit = 20) {
        try {
            
            const query = `
                SELECT * FROM gacha_history
                WHERE roleid = ?
                ORDER BY create_date DESC
            `;
            const [rows] = await db.getPool().execute(query, [roleid]);
            return rows;
        } catch (error) {
            console.error('Error in GachaPacketModel.getGachaHistory:', error);
            return [];
        }   
    }
    static async insertHistory(serverid,username,roleid,cost,packetId){

        try{
            const query = `
                INSERT INTO gacha_history (serverid,username,roleid,cost,create_date,sent_email,receive_item_id,remark) VALUES (?,?,?,?,?,?,?,?)
            `;
            
            const [result] = await db.getPool().execute(query, [serverid,username,roleid,cost,new Date(),0,packetId,'']);
            
            if (result.affectedRows > 0) {
                return {
                    success: true,
                    message: 'Gacha history inserted successfully',   
                    data: {
                        id: result.insertId
                    }
                };
            } else {
                return {
                    success: false,
                    message: 'Gacha history not inserted'
                };
            }
        } catch (error) {
            console.error('Error in GachaPacketModel.insertHistory:', error);
            return {
                success: false,
                message: 'Gacha history not inserted'
            };
        }
    }

    static async updateHistory(id,receive_item_ids) {
        try{
            const query = `
            UPDATE gacha_history SET receive_item_ids = ? WHERE id = ?
            `;
            const [result] = await db.getPool().execute(query, [JSON.stringify(receive_item_ids),id]);
            if (result.affectedRows > 0) {
                return {
                    success: true,
                    message: 'Gacha history updated successfully',
                };
            }
            else {
                return {
                    success: false,
                    message: 'Gacha history not updated'
                };
            }
        }
        catch (error) {
            console.error('Error in GachaPacketModel.updateHistory:', error);
            return {
                success: false,
                message: 'Gacha history not updated'
            };
        }
    }

    //Update History send email
    static async updateHistorySendEmail(id,sent_email,remark) {
        try{
            const query = `
            UPDATE gacha_history SET sent_email = ?, remark = ? WHERE id = ?
            `;
            const [result] = await db.getPool().execute(query, [sent_email,remark,id]);
            if (result.affectedRows > 0) {
                return {
                    success: true,
                    message: 'Gacha history sent email updated successfully',
                };
            } else {                    
                return {
                    success: false,
                    message: 'Gacha history sent email not updated'
                };
            }
        } catch (error) {
                console.error('Error in GachaPacketModel.updateHistorySendEmail:', error);
                return {
                    success: false,
                    message: 'Gacha history sent email not updated'
                };
        }
    }

}

module.exports = GachaPacketModel;
