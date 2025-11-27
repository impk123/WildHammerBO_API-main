const backendUserService = require('../services/backendUserSevice');
const { validationResult } = require('express-validator');

// Ref.:
// TABLE `game_backend_user` (
//   `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
//   `channelUserId` varchar(64) NOT NULL,
//   `gameId` smallint(5) unsigned NOT NULL,
//   `channelType` varchar(191) NOT NULL,
//   `channelAppId` smallint(5) unsigned NOT NULL,
//   `createdAt` datetime NOT NULL DEFAULT current_timestamp(),
//   `updatedAt` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
//   `email` varchar(50) NOT NULL DEFAULT '',
//   `verified` int(11) NOT NULL DEFAULT 0,
//   `verifyCode` varchar(10) NOT NULL,
//   `countGetCode` int(11) NOT NULL DEFAULT 0,
//   `password` varchar(255) DEFAULT '',
//   `realMoney` decimal(11,2) NOT NULL DEFAULT 0.00,
//   PRIMARY KEY (`id`),
//   KEY `game_backend_user_gameId_channelAppId_channelUserId_idx` (`gameId`,`channelAppId`,`channelUserId`),
//   CONSTRAINT `game_backend_user_gameId_fkey` FOREIGN KEY (`gameId`) REFERENCES `games` (`id`) ON UPDATE CASCADE
// ) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb

class BackendUserController {
    async getAllUsers(req, res, next) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const filters = req.query.filters ? JSON.parse(req.query.filters) : {};

            const result = await backendUserService.getAllUsers(page, limit, filters);

            res.json(result);
        } catch (error) {
            console.error('Get all users error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve users'
            });
        }
    }

    async refreshUserId(req, res, next) {
        try {
            const { userId } = req.params;
            const result = await backendUserService.refreshUserId(userId);
            res.json(result);
        } catch (error) {
            console.error('Refresh user ID error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to refresh user ID'
            });
        }
    }

    async updateUserRealmoney(req, res, next) {
        try {
            const { userId } = req.params;
            const { realMoney, reason } = req.body;
            const adminUsername = req.admin?.username || 'admin'; // ดึงจาก JWT token

            const result = await backendUserService.updateUserRealmoney(userId, realMoney, reason, adminUsername);
            console.log('Update user realmoney result:', result);
            res.json(result);
        } catch (error) {
            console.error('Update user realmoney error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update user realmoney'
            });
        }
    }

    async updateUserPassword(req, res, next) {
        try {
            // ตรวจสอบ validation errors
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const { userId } = req.params;
            const { newPassword, confirmPassword } = req.body;
            const adminUsername = req.admin?.username || 'admin'; // ดึงจาก JWT token

            // ตรวจสอบว่า password ตรงกัน (double check)
            if (newPassword !== confirmPassword) {
                return res.status(400).json({
                    success: false,
                    message: 'Passwords do not match'
                });
            }

            const result = await backendUserService.updateUserPassword(userId, newPassword, adminUsername);

            res.json(result);
        } catch (error) {
            console.error('Update user password error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update user password'
            });
        }
    }

}

const backendUserController = new BackendUserController();
module.exports = backendUserController;