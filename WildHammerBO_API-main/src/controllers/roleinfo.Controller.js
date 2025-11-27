const roleInfoService = require('../services/roleinfoService');

class RoleInfoController {
    async getAllRoleInfo(req, res, next) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const filters = req.query.filters ? JSON.parse(req.query.filters) : {};

            const result = await roleInfoService.getAllRoleInfo(page, limit, filters);

            res.json({
                success: true,
                data: result,
                pagination: {
                    page,
                    limit,
                    total: result.length
                }
            });
        } catch (error) {
            console.error('Get all role info error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve role info'
            });
        }
    }

    async getRoleInfoById(req, res, next) {
        try {
            const { id } = req.params;
            const result = await roleInfoService.getRoleInfoById(id);
            
            if (result) {
                res.json({
                    success: true,
                    data: result
                });
            } else {
                res.status(404).json({
                    success: false,
                    message: 'Role info not found'
                });
            }
        } catch (error) {
            console.error('Get role info by ID error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve role info'
            });
        }
    }

    async getRoleInfoByUserId(req, res, next) {
        try {
            const { userId } = req.params;
            const result = await roleInfoService.getRoleInfoByUserId(userId);
            
            res.json({
                success: true,
                data: result,
                userId: userId
            });
        } catch (error) {
            console.error('Get role info by user ID error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve user role info'
            });
        }
    }

    async updateRoleInfo(req, res, next) {
        try {
            const { id } = req.params;
            const roleData = req.body;
            const adminUsername = req.admin?.username || 'admin';

            const result = await roleInfoService.updateRoleInfo(id, roleData, adminUsername);
            res.json(result);
        } catch (error) {
            console.error('Update role info error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update role info'
            });
        }
    }

    async deleteRoleInfo(req, res, next) {
        try {
            const { id } = req.params;
            const adminUsername = req.admin?.username || 'admin';

            const result = await roleInfoService.deleteRoleInfo(id, adminUsername);
            res.json(result);
        } catch (error) {
            console.error('Delete role info error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete role info'
            });
        }
    }

    async createRoleInfo(req, res, next) {
        try {
            const roleData = req.body;
            const adminUsername = req.admin?.username || 'admin';

            const result = await roleInfoService.createRoleInfo(roleData, adminUsername);
            res.json(result);
        } catch (error) {
            console.error('Create role info error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create role info'
            });
        }
    }

    async getRoleInfoStats(req, res, next) {
        try {
            const result = await roleInfoService.getRoleInfoStats();
            
            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            console.error('Get role info stats error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve role info statistics'
            });
        }
    }
}

const roleInfoController = new RoleInfoController();
module.exports = roleInfoController;
