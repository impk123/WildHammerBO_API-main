const db = require('./db_wgbackend');
const crypto = require('crypto');

class backendUserModel {
    // Create a new gift code
    static async findAll(page = 1, limit = 20, filters = {}) {
        let query = `
            SELECT * FROM game_backend_user 
        `;

        const [rows] = await db.getPool().execute(query);
        
        return rows;
    }

    static async findById(serverId, userId) {
        let query = `
            SELECT * FROM game_backend_user 
            WHERE 
            gameId =${serverId} 
            AND 
            channelUserId='${userId}' 
        `;

        
        const [rows] = await db.getPool().execute(query);
        
        return rows;
    }

    static async reduceRealmoney(serverId,userId,realMoney) {
        let query = `
            UPDATE game_backend_user 
            SET realMoney = realMoney - ? 
            WHERE gameId = ? AND channelUserId = ?
        `;
    
        const [result] = await db.getPool().execute(query, [realMoney, serverId, userId]);
        return result;
    }

    static async refundRealmoney(serverId,userId,realMoney) {
        let query = `
            UPDATE game_backend_user 
            SET realMoney = realMoney + ? 
            WHERE gameId = ? AND channelUserId = ?
        `;
    
        const [result] = await db.getPool().execute(query, [realMoney, serverId, userId]);
        return result;
    }

    static async refreshUserId(userId) {
        const query = `
            SELECT * FROM game_backend_user WHERE id = ?
        `;
        const [result] = await db.getPool().execute(query, [userId]);
        return result;
    }
   
    static async updateRealmoney(userId, realMoney, reason = 'Administrative adjustment', adminUsername = 'admin',serverId) {
        // ดึงข้อมูลเก่าก่อน
        const getOldDataQuery = `
            SELECT realMoney FROM game_backend_user WHERE channelUserId = ? AND gameId = ?
        `;
        const [oldDataResult] = await db.getPool().execute(getOldDataQuery, [userId, serverId]);
        
        if (oldDataResult.length === 0) {
            return {
                success: false,
                message: 'User not found'
            };
        }
        
        const oldBalance = oldDataResult[0].realMoney;
        
        // อัพเดตข้อมูลใหม่
        const updateQuery = `
            UPDATE game_backend_user 
            SET realMoney = ? 
            WHERE channelUserId = ? AND gameId = ?
        `;
        const [result] = await db.getPool().execute(updateQuery, [realMoney, userId, serverId   ]);
        
        if (result.affectedRows > 0) {
            return {
                success: true,
                message: 'Real money balance updated successfully',
                data: {
                    userId: userId,
                    oldBalance: oldBalance.toString(),
                    newBalance: realMoney.toString(),
                    updatedBy: adminUsername,
                    reason: reason || 'Administrative adjustment',
                    updatedAt: new Date().toISOString()
                }
            };
        } else {
            return {
                success: false,
                message: 'Failed to update user realmoney'
            };
        }
    }

    static async increaseRealmoney(userId, realMoney, reason = 'Administrative adjustment', adminUsername = 'admin',serverId) {
        const getOldDataQuery = `
            SELECT realMoney FROM game_backend_user WHERE channelUserId = ? AND gameId = ?  
        `;
        const [oldDataResult] = await db.getPool().execute(getOldDataQuery, [userId, serverId]);
        
        if (oldDataResult.length === 0) {
            return {
                success: false,
                message: 'User not found'
            };
        }
        
        const oldBalance = oldDataResult[0].realMoney;
        
        const updateQuery = `
            UPDATE game_backend_user 
            SET realMoney = realMoney + ? 
            WHERE channelUserId = ? AND gameId = ?
        `;
        const [result] = await db.getPool().execute(updateQuery, [realMoney, userId, serverId]);
        if (result.affectedRows > 0) {
            return {
                success: true,
                message: 'Real money balance updated successfully',
                data: {
                    userId: userId,
                    oldBalance: oldBalance.toString(),
                    newBalance: realMoney.toString(),
                    updatedBy: adminUsername,
                    reason: reason || 'Administrative adjustment',
                    updatedAt: new Date().toISOString()
                }
            };
        }
        return {
            success: false,
            message: 'Failed to increase user realmoney'
        };
    }
    
    static async decreaseRealmoney(userId, realMoney, reason = 'Administrative adjustment', adminUsername = 'admin',serverId) {
        const getOldDataQuery = `
            SELECT realMoney FROM game_backend_user WHERE channelUserId = ? AND gameId = ?
        `;
        const [oldDataResult] = await db.getPool().execute(getOldDataQuery, [userId, serverId]);
        
    
        if (oldDataResult.length === 0) {
            return {
                success: false,
                message: 'User not found'
            };
        }
    
        const oldBalance = oldDataResult[0].realMoney;
        
        const updateQuery = `
            UPDATE game_backend_user 
            SET realMoney = realMoney - ? 
            WHERE channelUserId = ? AND gameId = ?
        `;
        const [result] = await db.getPool().execute(updateQuery, [realMoney, userId, serverId]);
        if (result.affectedRows > 0) {
            return {
                success: true,
                message: 'Real money balance updated successfully',
                data: {
                    userId: userId,
                    oldBalance: oldBalance.toString(),
                    newBalance: realMoney.toString(),
                    updatedBy: adminUsername,
                    reason: reason || 'Administrative adjustment',
                    updatedAt: new Date().toISOString()
                }
            };
        }   
        return {
            success: false,
            message: 'Failed to decrease user realmoney'
        };
    }

    static async updatePassword(userId, password, adminUsername = 'admin') {
        const setPassword = password || '';

        // ตรวจสอบความยาวของ password
        if (setPassword.length < 3) {
            return {
                success: false,
                message: 'Password must be at least 3 characters long'
            };
        }

        if (setPassword === '') {
            return {
                success: false,
                message: 'Password cannot be empty'
            };
        }

        // ตรวจสอบว่า user มีอยู่หรือไม่
        const checkUserQuery = `
            SELECT id FROM game_backend_user WHERE id = ?
        `;
        const [userResult] = await db.getPool().execute(checkUserQuery, [userId]);
        
        if (userResult.length === 0) {
            return {
                success: false,
                message: 'User not found'
            };
        }

        // อัพเดต password
        const updateQuery = `
            UPDATE game_backend_user 
            SET password = ? 
            WHERE id = ?
        `;

        const [result] = await db.getPool().execute(updateQuery, [setPassword, userId]);
        
        if (result.affectedRows > 0) {
            return {
                success: true,
                message: 'Password updated successfully',
                data: {
                    userId: parseInt(userId),
                    updatedBy: adminUsername,
                    updatedAt: new Date().toISOString()
                }
            };
        } else {
            return {
                success: false,
                message: 'Failed to update password'
            };
        }
    }

}

module.exports = backendUserModel;
