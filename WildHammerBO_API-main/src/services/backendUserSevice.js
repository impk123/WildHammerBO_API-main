
const backendUserModel = require('../models/gameBackendUser');


class BackendUserService  { 
    async getAllUsers(page, limit, filters) {
        return await backendUserModel.findAll(page, limit, filters);
    }

    async getUsersById(serverId,userId)
    {
        return await backendUserModel.findById(serverId,userId);
    }

    async reduceRealmoney(serverId,userId,realMoney) {
        return await backendUserModel.reduceRealmoney(serverId,userId,realMoney);
    }

    async refundRealmoney(serverId,userId,realMoney) {
        return await backendUserModel.refundRealmoney(serverId,userId,realMoney);
    }

    async refreshUserId(userId) {
        return await backendUserModel.refreshUserId(userId);
    }

    async updateUserRealmoney(userId, realMoney, reason, adminUsername,serverId) {
        return await backendUserModel.updateRealmoney(userId, realMoney, reason, adminUsername,serverId);
    }

    async updateUserPassword(userId, password, adminUsername) {
        return await backendUserModel.updatePassword(userId, password, adminUsername);
    }

    async increaseRealmoney(userId, realMoney, reason, adminUsername,serverId) {
        return await backendUserModel.increaseRealmoney(userId, realMoney, reason, adminUsername,serverId);
    }
}

const backendUserService = new BackendUserService();
module.exports = backendUserService;