const db_backoffice = require('./db_backoffice');

class GamePacketModel {
    /**
     * Get all active game packets with optional filtering
     */
    static async findAll(filters = {}) {
        try {
            let query = `
                SELECT gp.*, 
                       (SELECT COUNT(*) FROM packet_purchases pp WHERE pp.packet_id = gp.id) as total_purchases,
                       (SELECT COUNT(DISTINCT pp.username) FROM packet_purchases pp WHERE pp.packet_id = gp.id) as unique_buyers
                FROM game_packets gp
                WHERE 1=1
            `;
            
            const params = [];
            
            if (filters.is_active !== undefined) {
                query += ' AND gp.is_active = ?';
                params.push(filters.is_active);
            }
            
            if (filters.is_featured !== undefined) {
                query += ' AND gp.is_featured = ?';
                params.push(filters.is_featured);
            }
            
            if (filters.packet_type) {
                query += ' AND gp.packet_type = ?';
                params.push(filters.packet_type);
            }
            
            if (filters.level_requirement) {
                query += ' AND gp.level_requirement <= ?';
                params.push(filters.level_requirement);
            }
            
            query += ' ORDER BY gp.sort_order ASC, gp.created_at DESC';
            
            if (filters.limit) {
                query += ' LIMIT ?';
                params.push(parseInt(filters.limit));
                
                if (filters.offset) {
                    query += ' OFFSET ?';
                    params.push(parseInt(filters.offset));
                }
            }
            
            const [rows] = await db_backoffice.execute(query, params);
            return rows;
        } catch (error) {
            console.error('Error in GamePacketModel.findAll:', error);
            throw error;
        }
    }

    /**
     * Get a single packet by ID with its items
     */
    static async findById(packetId) {
        try {
                        
            // Get packet details
            const packetQuery = `
                SELECT gp.*, 
                       (SELECT COUNT(*) FROM packet_purchases pp WHERE pp.packet_id = gp.id ) as total_purchases                                                                     
                FROM game_packets gp 
                WHERE gp.id = ?
            `;
                        
            const [packetRows] = await db_backoffice.execute(packetQuery, [packetId]);
                        
            if (packetRows.length === 0) {            
                return null;
            }
            
            const packet = packetRows[0];
            
            if (packet.game_items) {
                try {
                    packet.game_items = JSON.parse(packet.game_items);                    
                } catch (jsonError) {
                    console.error('Error parsing game_items JSON:', jsonError.message);
                    console.error('game_items value:', packet.game_items);
                }
            }
            if (packet.equipment_items) {
                try {
                    packet.equipment_items = JSON.parse(packet.equipment_items);                    
                } catch (jsonError) {
                    console.error('Error parsing equipment_items JSON:', jsonError.message);
                    console.error('equipment_items value:', packet.equipment_items);
                }
            }
            
            return packet;
        } catch (error) {
            console.error('Error in GamePacketModel.findById:', error);
            console.error('Error stack:', error.stack);
            throw error;
        }
    }

    static async findByIdAndRoleid(packetId,roleid) {
        try {
                        
            // Get packet details
            const packetQuery = `
                SELECT gp.*, 
                       (SELECT COUNT(*) FROM packet_purchases pp WHERE pp.packet_id = gp.id AND pp.roleid = ?) as total_purchases,                                              
                       (SELECT COUNT(*) FROM packet_purchases pp WHERE pp.packet_id = gp.id AND pp.roleid = ? AND DATE(purchase_date) = CURDATE()) as today_purchases
                FROM game_packets gp 
                WHERE gp.id = ?
            `;
                        
            const [packetRows] = await db_backoffice.execute(packetQuery, [roleid,roleid,packetId]);
                        
            if (packetRows.length === 0) {            
                return null;
            }
            
            const packet = packetRows[0];
            
            if (packet.game_items) {
                try {
                    packet.game_items = JSON.parse(packet.game_items);                    
                } catch (jsonError) {
                    console.error('Error parsing game_items JSON:', jsonError.message);
                    console.error('game_items value:', packet.game_items);
                }
            }
            if (packet.equipment_items) {
                try {
                    packet.equipment_items = JSON.parse(packet.equipment_items);                    
                } catch (jsonError) {
                    console.error('Error parsing equipment_items JSON:', jsonError.message);
                    console.error('equipment_items value:', packet.equipment_items);
                }
            }
            
            return packet;
        } catch (error) {
            console.error('Error in GamePacketModel.findById:', error);
            console.error('Error stack:', error.stack);
            throw error;
        }
    }

    /**
     * Create a new game packet
     */
    static async create(packetData) {
        try {
            const {
                name, description, packet_type, price_token, game_items, equipment_items,
                is_active, is_featured, max_purchases_per_user, daily_purchase_limit,
                level_requirement, image_url, sort_order,packet_rarity,packet_rarity_name
            } = packetData;

            const query = `
                INSERT INTO game_packets (
                    name, description, packet_type, price_token, game_items, equipment_items,
                    is_active, is_featured, max_purchases_per_user, daily_purchase_limit,
                    level_requirement, image_url, sort_order,packet_rarity,packet_rarity_name
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            // แปลง undefined เป็น null หรือ default values
            const params = [
                name,
                description || null,
                packet_type,
                price_token || 0,
                JSON.stringify(game_items || []),
                JSON.stringify(equipment_items || []),
                is_active !== undefined ? is_active : 1,
                is_featured !== undefined ? is_featured : 0,
                max_purchases_per_user || null,  // ← แปลง undefined เป็น null
                daily_purchase_limit || null,    // ← แปลง undefined เป็น null
                level_requirement || 1,
                image_url || null,               // ← แปลง undefined เป็น null
                sort_order || 0,
                packet_rarity || null,
                packet_rarity_name || null
            ];

            // console.log('Creating packet with params:', params.map((p, i) => 
            //     `${i}: ${p === null ? 'NULL' : typeof p} = ${p}`
            // ));

            const [result] = await db_backoffice.execute(query, params);
            return result.insertId;
            
        } catch (error) {
            console.error('Error in GamePacketModel.create:', error);
            throw error;
        }
    }

    /**
     * Update a game packet
     */
    static async update(packetId, packetData) {
        try {
            const fields = [];
            const params = [];

            Object.keys(packetData).forEach(key => {
                if (packetData[key] !== undefined) {
                    fields.push(`${key} = ?`);
                    
                    // Handle JSON fields
                    if (key === 'game_items' || key === 'equipment_items') {
                        params.push(JSON.stringify(packetData[key] || []));
                    } else {
                        // แปลง undefined เป็น null
                        params.push(packetData[key] === undefined ? null : packetData[key]);
                    }
                }
            });

            if (fields.length === 0) {
                throw new Error('No fields to update');
            }

            fields.push('updated_at = CURRENT_TIMESTAMP');
            params.push(packetId);

            const query = `UPDATE game_packets SET ${fields.join(', ')} WHERE id = ?`;
            
            
            const [result] = await db_backoffice.execute(query, params);
            return result.affectedRows > 0;
            
        } catch (error) {
            console.error('Error in GamePacketModel.update:', error);
            throw error;
        }
    }

    /**
     * Delete a game packet (soft delete by setting is_active = 0)
     */
    static async delete(packetId) {
        try {
            const query = 'UPDATE game_packets SET is_active = 0 WHERE id = ?';
            const [result] = await db_backoffice.execute(query, [packetId]);
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error in GamePacketModel.delete:', error);
            throw error;
        }
    }

    // Note: Item management is now done through JSON fields in the game_packets table
    // addItem, updateItem, and removeItem methods are no longer needed

    /**
     * Check if user can purchase packet (level requirement, purchase limits)
     */
    static async canUserPurchase(userId, packetId) {
        try {
            // Get packet info
            const packetQuery = 'SELECT * FROM game_packets WHERE id = ? AND is_active = 1';
            const [packetRows] = await db_backoffice.execute(packetQuery, [packetId]);
            
            if (packetRows.length === 0) {
                return { canPurchase: false, reason: 'Packet not found or inactive' };
            }
            
            const packet = packetRows[0];
            
            // Get user info
            const userQuery = 'SELECT level, tokens FROM users WHERE id = ? AND is_active = 1';
            const [userRows] = await db_backoffice.execute(userQuery, [userId]);
            
            if (userRows.length === 0) {
                return { canPurchase: false, reason: 'User not found or inactive' };
            }
            
            const user = userRows[0];
            
            // Check level requirement
            if (user.level < packet.level_requirement) {
                return { 
                    canPurchase: false, 
                    reason: `Level ${packet.level_requirement} required`
                };
            }
            
            // Check token availability
            if (packet.price_token > 0 && user.tokens < packet.price_token) {
                return { canPurchase: false, reason: 'Insufficient tokens' };
            }
            
            // Check purchase limits
            if (packet.max_purchases_per_user) {
                const totalPurchasesQuery = `
                    SELECT COUNT(*) as total 
                    FROM packet_purchases 
                    WHERE user_id = ? AND packet_id = ?
                `;
                const [totalRows] = await db_backoffice.execute(totalPurchasesQuery, [userId, packetId]);
                
                if (totalRows[0].total >= packet.max_purchases_per_user) {
                    return { canPurchase: false, reason: 'Maximum purchases reached' };
                }
            }
            
            // Check daily purchase limit
            if (packet.daily_purchase_limit) {
                const todayPurchasesQuery = `
                    SELECT COUNT(*) as today_total 
                    FROM packet_purchases 
                    WHERE user_id = ? AND packet_id = ? AND DATE(purchase_date) = CURDATE()
                `;
                const [todayRows] = await db_backoffice.execute(todayPurchasesQuery, [userId, packetId]);
                
                if (todayRows[0].today_total >= packet.daily_purchase_limit) {
                    return { canPurchase: false, reason: 'Daily purchase limit reached' };
                }
            }
            
            return { canPurchase: true, packet, user };
        } catch (error) {
            console.error('Error in GamePacketModel.canUserPurchase:', error);
            throw error;
        }
    }

    /**
     * Process packet purchase
     */
    static async purchasePacket(userId, packetId, purchaseData = {}) {
        const connection = await db_backoffice.getConnection();
        
        try {
            await connection.beginTransaction();
            
            // Check if user can purchase
            const canPurchase = await this.canUserPurchase(userId, packetId);
            if (!canPurchase.canPurchase) {
                throw new Error(canPurchase.reason);
            }
            
            const { packet, user } = canPurchase;
            
            // Determine payment type and amount - now only tokens
            const paymentType = 'token';
            const amountPaid = packet.price_token || 0;
            
            // Deduct tokens from user
            if (amountPaid > 0) {
                const updateTokensQuery = `
                    UPDATE users 
                    SET tokens = tokens - ?, updated_at = CURRENT_TIMESTAMP 
                    WHERE id = ?
                `;
                await connection.execute(updateTokensQuery, [amountPaid, userId]);
            }
            
            // Generate items from packet (from JSON fields)
            const itemsReceived = [];
            
            // Process game_items
            if (packet.game_items) {
                const gameItems = JSON.parse(packet.game_items);
                for (const item of gameItems) {
                    // Check drop chance
                    const randomChance = Math.random() * 100;
                    const dropChance = item.drop_chance || 100;
                    const isGuaranteed = item.is_guaranteed !== undefined ? item.is_guaranteed : true;
                    
                    if (isGuaranteed || randomChance <= dropChance) {
                        itemsReceived.push({
                            item_type: 'game_item',
                            item_id: item.id,
                            item_name: item.name,
                            quantity: item.quantity || 1,
                            rarity: item.rarity || 'common'
                        });
                        
                        // Add to user inventory
                        await this.addToUserInventory(connection, userId, {
                            item_type: 'game_item',
                            item_id: item.id,
                            quantity: item.quantity || 1
                        });
                    }
                }
            }
            
            // Process equipment_items
            if (packet.equipment_items) {
                const equipmentItems = JSON.parse(packet.equipment_items);
                for (const item of equipmentItems) {
                    // Check drop chance
                    const randomChance = Math.random() * 100;
                    const dropChance = item.drop_chance || 100;
                    const isGuaranteed = item.is_guaranteed !== undefined ? item.is_guaranteed : true;
                    
                    if (isGuaranteed || randomChance <= dropChance) {
                        itemsReceived.push({
                            item_type: 'equipment',
                            item_id: item.id,
                            item_name: item.name,
                            quantity: item.quantity || 1,
                            rarity: item.rarity || 'common'
                        });
                        
                        // Add to user inventory
                        await this.addToUserInventory(connection, userId, {
                            item_type: 'equipment',
                            item_id: item.id,
                            quantity: item.quantity || 1
                        });
                    }
                }
            }
            
            // Record purchase
            const purchaseQuery = `
                INSERT INTO packet_purchases (
                    user_id, packet_id, payment_type, amount_paid, items_received,
                    ip_address, user_agent
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `;
            
            const [purchaseResult] = await connection.execute(purchaseQuery, [
                userId, packetId, paymentType, amountPaid, JSON.stringify(itemsReceived),
                purchaseData.ip_address || null, purchaseData.user_agent || null
            ]);
            
            await connection.commit();
            
            return {
                purchase_id: purchaseResult.insertId,
                packet_name: packet.name,
                payment_type: paymentType,
                amount_paid: amountPaid,
                items_received: itemsReceived
            };
            
        } catch (error) {
            await connection.rollback();
            console.error('Error in GamePacketModel.purchasePacket:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Add items to user inventory
     */
    static async addToUserInventory(connection, userId, item) {
        try {
            // Handle special items like currency
            if (item.item_type === 'currency') {
                if (item.item_id === 'coins') {
                    await connection.execute(
                        'UPDATE users SET coins = coins + ? WHERE id = ?',
                        [item.quantity, userId]
                    );
                } else if (item.item_id === 'gems') {
                    await connection.execute(
                        'UPDATE users SET gems = gems + ? WHERE id = ?',
                        [item.quantity, userId]
                    );
                } else if (item.item_id === 'tokens') {
                    await connection.execute(
                        'UPDATE users SET tokens = tokens + ? WHERE id = ?',
                        [item.quantity, userId]
                    );
                }
                return;
            }
            
            // Add to user_inventory table
            const inventoryQuery = `
                INSERT INTO user_inventory (user_id, item_type, item_id, quantity)
                VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)
            `;
            
            await connection.execute(inventoryQuery, [
                userId, item.item_type, item.item_id, item.quantity
            ]);
        } catch (error) {
            console.error('Error in GamePacketModel.addToUserInventory:', error);
            throw error;
        }
    }

    /**
     * Get user's packet purchase history
     */
    static async getUserPurchaseHistory(roleId) {
        try {
            const query = `
                SELECT pp.*, gp.name as packet_name, gp.packet_type
                FROM packet_purchases pp
                JOIN game_packets gp ON pp.packet_id = gp.id
                WHERE pp.roleid = ?
                ORDER BY pp.purchase_date DESC
             
            `;

            const [rows] = await db_backoffice.execute(query, [roleId]);
            return rows;

        } catch (error) {
            console.error('Error in GamePacketModel.getUserPurchaseHistory:', error);
            throw error;
        }
    }

    /**
     * Get packet statistics
     */
    static async getStatistics() {
        try {
            const query = 'SELECT * FROM packet_statistics ORDER BY total_purchases DESC';
            const [rows] = await db_backoffice.execute(query);
            return rows;
        } catch (error) {
            console.error('Error in GamePacketModel.getStatistics:', error);
            throw error;
        }
    }

    /**
     * Insert packet purchase history
     */
    static async insertPacketPurchaseHistory(serverid, username, roleid, cost, packetId, items = '') {
        try {
            const query = `
                INSERT INTO packet_purchases (
                    serverid, username, roleid, cost,packet_id, purchase_date, sent_email, remark, items
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            const [result] = await db_backoffice.execute(query, [
                serverid, 
                username, 
                roleid, 
                cost, 
                packetId,                
                new Date(),
                0, 
                '', 
                items
            ]);
            return {
                success: true,
                data: {
                    id: result.insertId,
                    affectedRows: result.affectedRows
                }
            };
        } catch (error) {
            console.error('Error in GamePacketModel.insertPacketPurchaseHistory:', error);
            return {
                success: false,
                message: 'Failed to insert packet purchase history'
            };
        }
    }

    /**
     * Update history send email
     */
    static async updateHistorySendEmail(id,sent_email,remark) {
        try {
            const query = `UPDATE packet_purchases SET sent_email = ?, remark = ? WHERE id = ?`;
            const [result] = await db_backoffice.execute(query, [sent_email,remark,id]);
            return result.affectedRows > 0;
        }
        catch (error) {
            console.error('Error in GamePacketModel.updateHistorySendEmail:', error);
            return {
                success: false,
                message: 'Failed to update history send email'
            };
        }
    }
}

module.exports = GamePacketModel;