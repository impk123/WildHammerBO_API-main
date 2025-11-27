const db = require('./db_backoffice');

class EmailPacketModel {
    // Get all email packets with pagination and filters
    static async findAll(page = 1, limit = 20, filters = {}) {
        let query = `
            SELECT * FROM email_packets 
        `;
        
        const conditions = [];
        const params = [];
        
        if (filters.is_active !== undefined) {
            conditions.push('is_active = ?');
            params.push(filters.is_active);
        }
        
        if (filters.title) {
            conditions.push('title LIKE ?');
            params.push(`%${filters.title}%`);
        }
        
        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }
        
        // Add pagination
        const offset = (page - 1) * limit;
        query += ` ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
        
        const [rows] = await db.getPool().execute(query, params);
        return rows;
    }

    // Get email packet by id
    static async findById(id) {
        const query = `
            SELECT * FROM email_packets WHERE id = ?
        `;
        const [rows] = await db.getPool().execute(query, [id]);
        return rows.length > 0 ? rows[0] : null;
    }

    // Create new email packet
    static async create(packetData) {
        const fields = Object.keys(packetData);
        const values = Object.values(packetData);
        const placeholders = fields.map(() => '?').join(', ');
        
        const query = `
            INSERT INTO email_packets (${fields.join(', ')}) 
            VALUES (${placeholders})
        `;
        
        const [result] = await db.getPool().execute(query, values);
        
        if (result.affectedRows > 0) {
            return {
                success: true,
                message: 'Email packet created successfully',
                data: {
                    id: result.insertId,
                    createdAt: new Date().toISOString()
                }
            };
        } else {
            return {
                success: false,
                message: 'Failed to create email packet'
            };
        }
    }

    // Update email packet
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
            UPDATE email_packets 
            SET ${updateFields.join(', ')} 
            WHERE id = ?
        `;
        
        const [result] = await db.getPool().execute(query, params);
        
        if (result.affectedRows > 0) {
            return {
                success: true,
                message: 'Email packet updated successfully',
                data: {
                    id: id,
                    updatedAt: new Date().toISOString()
                }
            };
        } else {
            return {
                success: false,
                message: 'Email packet not found or no changes made'
            };
        }
    }

    // Delete email packet
    static async delete(id) {
        const query = `
            DELETE FROM email_packets WHERE id = ?
        `;
        
        const [result] = await db.getPool().execute(query, [id]);
        
        if (result.affectedRows > 0) {
            return {
                success: true,
                message: 'Email packet deleted successfully',
                data: {
                    id: id,
                    deletedAt: new Date().toISOString()
                }
            };
        } else {
            return {
                success: false,
                message: 'Email packet not found'
            };
        }
    }

    // Get active email packets
    static async getActivePackets() {
        const query = `
            SELECT * FROM email_packets 
            WHERE is_active = 1 
            ORDER BY created_at DESC
        `;
        
        const [rows] = await db.getPool().execute(query);
        return rows;
    }

    // Get email packet statistics
    static async getStatistics() {
        const query = `
            SELECT 
                COUNT(*) as total_packets,
                SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_packets,
                SUM(CASE WHEN game_items IS NOT NULL THEN 1 ELSE 0 END) as packets_with_game_items,
                SUM(CASE WHEN equipment_items IS NOT NULL THEN 1 ELSE 0 END) as packets_with_equipment_items,
                SUM(total_sent) as total_emails_sent
            FROM email_packets
        `;
        
        const [rows] = await db.getPool().execute(query);
        return rows.length > 0 ? rows[0] : null;
    }

    // Toggle active status
    static async toggleActiveStatus(id) {
        const packet = await this.findById(id);
        if (!packet) {
            return {
                success: false,
                message: 'Email packet not found'
            };
        }

        const newStatus = packet.is_active === 1 ? 0 : 1;
        return await this.update(id, { is_active: newStatus });
    }

    // Increment total_sent counter
    static async incrementSentCount(id) {
        const query = `
            UPDATE email_packets 
            SET total_sent = total_sent + 1, updated_at = ?
            WHERE id = ?
        `;
        
        const [result] = await db.getPool().execute(query, [new Date(), id]);
        
        if (result.affectedRows > 0) {
            return {
                success: true,
                message: 'Sent count incremented successfully'
            };
        } else {
            return {
                success: false,
                message: 'Email packet not found'
            };
        }
    }

    // Reset total_sent counter
    static async resetSentCount(id) {
        return await this.update(id, { total_sent: 0 });
    }
}

module.exports = EmailPacketModel;
