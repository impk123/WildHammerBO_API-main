const GamePacketModel = require('../models/gamePacket');
const db_backoffice = require('../models/db_backoffice');

/**
 * Service for handling packet purchases and reward distribution
 */
class PacketService {
    /**
     * Validate and process packet purchase
     */
    static async processPurchase(userId, packetId, options = {}) {
        const connection = await db_backoffice.getConnection();
        
        try {
            await connection.beginTransaction();
            
            // Validate purchase eligibility
            const eligibility = await GamePacketModel.canUserPurchase(userId, packetId);
            if (!eligibility.canPurchase) {
                throw new Error(eligibility.reason);
            }
            
            const { packet, user } = eligibility;
            
            // Determine payment method
            const payment = this.determinePaymentMethod(packet, options.payment_type);
            
            // Validate user has enough currency
            this.validateUserCurrency(user, payment);
            
            // Deduct currency from user
            await this.deductCurrency(connection, userId, payment);
            
            // Generate reward items
            const rewards = await this.generateRewards(connection, packetId);
            
            // Distribute rewards to user
            await this.distributeRewards(connection, userId, rewards);
            
            // Record purchase transaction
            const purchaseRecord = await this.recordPurchase(
                connection, 
                userId, 
                packetId, 
                payment, 
                rewards,
                options
            );
            
            // Log currency transaction
            await this.logCurrencyTransaction(
                connection,
                userId,
                payment,
                'packet_purchase',
                `Purchased packet: ${packet.name}`
            );
            
            await connection.commit();
            
            return {
                success: true,
                purchase_id: purchaseRecord.insertId,
                packet: {
                    id: packet.id,
                    name: packet.name,
                    type: packet.packet_type
                },
                payment,
                rewards,
                user_balance: await this.getUserBalance(userId)
            };
            
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
    
    /**
     * Determine payment method based on packet prices and user preference
     */
    static determinePaymentMethod(packet, preferredType) {
        const hasCoinsPrice = packet.price_coins > 0;
        const hasGemsPrice = packet.price_gems > 0;
        
        if (hasCoinsPrice && hasGemsPrice) {
            // User can choose, default to preferred or coins
            const paymentType = preferredType || 'coins';
            return {
                type: paymentType,
                amount: paymentType === 'coins' ? packet.price_coins : packet.price_gems
            };
        } else if (hasCoinsPrice) {
            return {
                type: 'coins',
                amount: packet.price_coins
            };
        } else if (hasGemsPrice) {
            return {
                type: 'gems',
                amount: packet.price_gems
            };
        } else {
            // Free packet
            return {
                type: 'free',
                amount: 0
            };
        }
    }
    
    /**
     * Validate user has enough currency for payment
     */
    static validateUserCurrency(user, payment) {
        if (payment.type === 'coins' && user.coins < payment.amount) {
            throw new Error(`Insufficient coins. Required: ${payment.amount}, Available: ${user.coins}`);
        }
        if (payment.type === 'gems' && user.gems < payment.amount) {
            throw new Error(`Insufficient gems. Required: ${payment.amount}, Available: ${user.gems}`);
        }
    }
    
    /**
     * Deduct currency from user account
     */
    static async deductCurrency(connection, userId, payment) {
        if (payment.amount === 0) return;
        
        const updateQuery = `
            UPDATE users 
            SET ${payment.type} = ${payment.type} - ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        `;
        
        const [result] = await connection.execute(updateQuery, [payment.amount, userId]);
        
        if (result.affectedRows === 0) {
            throw new Error('Failed to deduct currency from user account');
        }
    }
    
    /**
     * Generate rewards from packet items based on drop chances
     */
    static async generateRewards(connection, packetId) {
        const itemsQuery = 'SELECT * FROM packet_items WHERE packet_id = ? ORDER BY rarity DESC';
        const [packetItems] = await connection.execute(itemsQuery, [packetId]);
        
        const rewards = [];
        
        for (const item of packetItems) {
            // Check if item should be awarded
            const shouldAward = item.is_guaranteed || (Math.random() * 100 <= item.drop_chance);
            
            if (shouldAward) {
                rewards.push({
                    item_type: item.item_type,
                    item_id: item.item_id,
                    item_name: item.item_name,
                    quantity: item.quantity,
                    rarity: item.rarity,
                    source: 'packet',
                    awarded_at: new Date()
                });
            }
        }
        
        // Ensure at least one reward if no guaranteed items were awarded
        if (rewards.length === 0 && packetItems.length > 0) {
            const fallbackItem = packetItems.find(item => item.rarity === 'common') || packetItems[0];
            rewards.push({
                item_type: fallbackItem.item_type,
                item_id: fallbackItem.item_id,
                item_name: fallbackItem.item_name,
                quantity: fallbackItem.quantity,
                rarity: fallbackItem.rarity,
                source: 'packet_fallback',
                awarded_at: new Date()
            });
        }
        
        return rewards;
    }
    
    /**
     * Distribute rewards to user inventory
     */
    static async distributeRewards(connection, userId, rewards) {
        for (const reward of rewards) {
            await this.addRewardToUser(connection, userId, reward);
        }
    }
    
    /**
     * Add individual reward to user
     */
    static async addRewardToUser(connection, userId, reward) {
        // Handle special reward types
        if (reward.item_type === 'currency') {
            if (reward.item_id === 'coins') {
                await connection.execute(
                    'UPDATE users SET coins = coins + ? WHERE id = ?',
                    [reward.quantity, userId]
                );
            } else if (reward.item_id === 'gems') {
                await connection.execute(
                    'UPDATE users SET gems = gems + ? WHERE id = ?',
                    [reward.quantity, userId]
                );
            }
            return;
        }
        
        // Handle experience rewards
        if (reward.item_type === 'experience') {
            await connection.execute(
                'UPDATE users SET experience = experience + ? WHERE id = ?',
                [reward.quantity, userId]
            );
            return;
        }
        
        // Add to user inventory
        const inventoryQuery = `
            INSERT INTO user_inventory (user_id, item_type, item_id, quantity)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)
        `;
        
        await connection.execute(inventoryQuery, [
            userId, 
            reward.item_type, 
            reward.item_id, 
            reward.quantity
        ]);
    }
    
    /**
     * Record purchase transaction
     */
    static async recordPurchase(connection, userId, packetId, payment, rewards, options) {
        const purchaseQuery = `
            INSERT INTO packet_purchases (
                user_id, packet_id, payment_type, amount_paid, items_received,
                ip_address, user_agent
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        
        const [result] = await connection.execute(purchaseQuery, [
            userId,
            packetId,
            payment.type,
            payment.amount,
            JSON.stringify(rewards),
            options.ip_address || null,
            options.user_agent || null
        ]);
        
        return result;
    }
    
    /**
     * Log currency transaction for audit trail
     */
    static async logCurrencyTransaction(connection, userId, payment, action, reason) {
        if (payment.amount === 0) return;
        
        try {
            const logQuery = `
                INSERT INTO currency_logs (
                    user_id, admin_id, currency_type, action, old_value, new_value, amount, reason
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            // Get current user balance to log the change
            const [userRows] = await connection.execute(
                'SELECT coins, gems FROM users WHERE id = ?', 
                [userId]
            );
            
            if (userRows.length > 0) {
                const user = userRows[0];
                const oldValue = user[payment.type] + payment.amount; // Before deduction
                const newValue = user[payment.type]; // After deduction
                
                await connection.execute(logQuery, [
                    userId,
                    null, // system transaction, not admin
                    payment.type,
                    'subtract',
                    oldValue,
                    newValue,
                    payment.amount,
                    reason
                ]);
            }
        } catch (error) {
            // Don't fail the purchase if logging fails
            console.warn('Failed to log currency transaction:', error);
        }
    }
    
    /**
     * Get user current balance
     */
    static async getUserBalance(userId) {
        const [rows] = await db_backoffice.execute(
            'SELECT coins, gems FROM users WHERE id = ?',
            [userId]
        );
        
        if (rows.length === 0) {
            throw new Error('User not found');
        }
        
        return {
            coins: rows[0].coins,
            gems: rows[0].gems
        };
    }
    
    /**
     * Get user's packet purchase summary
     */
    static async getUserPacketSummary(userId) {
        try {
            const summaryQuery = `
                SELECT 
                    COUNT(*) as total_purchases,
                    SUM(CASE WHEN payment_type = 'coins' THEN amount_paid ELSE 0 END) as total_coins_spent,
                    SUM(CASE WHEN payment_type = 'gems' THEN amount_paid ELSE 0 END) as total_gems_spent,
                    COUNT(DISTINCT packet_id) as unique_packets_purchased,
                    MIN(purchase_date) as first_purchase,
                    MAX(purchase_date) as latest_purchase
                FROM packet_purchases 
                WHERE user_id = ?
            `;
            
            const [rows] = await db_backoffice.execute(summaryQuery, [userId]);
            return rows[0];
        } catch (error) {
            console.error('Error getting user packet summary:', error);
            throw error;
        }
    }
    
    /**
     * Get popular packets based on purchase frequency
     */
    static async getPopularPackets(limit = 10) {
        try {
            const query = `
                SELECT 
                    gp.*,
                    COUNT(pp.id) as purchase_count,
                    COUNT(DISTINCT pp.user_id) as unique_buyers,
                    AVG(CASE WHEN pp.payment_type = 'coins' THEN pp.amount_paid END) as avg_coins_price,
                    AVG(CASE WHEN pp.payment_type = 'gems' THEN pp.amount_paid END) as avg_gems_price
                FROM game_packets gp
                LEFT JOIN packet_purchases pp ON gp.id = pp.packet_id
                WHERE gp.is_active = 1
                GROUP BY gp.id
                ORDER BY purchase_count DESC, unique_buyers DESC
                LIMIT ?
            `;
            
            const [rows] = await db_backoffice.execute(query, [limit]);
            return rows;
        } catch (error) {
            console.error('Error getting popular packets:', error);
            throw error;
        }
    }
}

module.exports = PacketService;