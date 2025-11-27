// backend/services/authService.js
const authSyncService = require('./authSyncService');

class AuthService {
    async login(email, password) {
        return await authSyncService.login(email, password);
    }

    async register(adminData, creatorId) {
        return await authSyncService.register(adminData, creatorId);
    }

    async verifyToken(token) {
        return await authSyncService.verifyToken(token);
    }

    // Method to check if admin has permission for role-based access
    async checkPermission(adminId, permission) {
        return await authSyncService.checkPermission(adminId, permission);
    }

    async updateProfile(adminId, updateData) {
        return await authSyncService.updateProfile(adminId, updateData);
    }

    async logout(adminId) {
        return await authSyncService.logout(adminId);
    }

    generateToken(admin) {
        return authSyncService.generateToken(admin);
    }

    toSafeObject(admin) {
        return authSyncService.toSafeObject(admin);
    }

    async getAdminStats() {
        return await authSyncService.getAdminStats();
    }

    async logActivity(adminId, action, clientInfo) {
        return await authSyncService.logActivity(adminId, action, clientInfo);
    }
}

module.exports = AuthService;