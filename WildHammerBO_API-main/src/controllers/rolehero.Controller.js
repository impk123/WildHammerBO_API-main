const roleHeroService = require('../services/roleheroService');

class RoleHeroController {
    async getAllRoleHero(req, res, next) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const filters = req.query.filters ? JSON.parse(req.query.filters) : {};

            const result = await roleHeroService.getAllRoleHero(page, limit, filters);

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
            console.error('Get all role hero error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve role heroes'
            });
        }
    }

    async getRoleHeroByUserId(req, res, next) {
        try {
            const { userId } = req.params;
            const result = await roleHeroService.getRoleHeroByUserId(userId);
            
            res.json({
                success: true,
                data: result,
                userId: userId
            });
        } catch (error) {
            console.error('Get role hero by user ID error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve user role heroes'
            });
        }
    }

    async getRoleHeroById(req, res, next) {
        try {
            const { id } = req.params;
            const result = await roleHeroService.getRoleHeroById(id);
            
            if (result) {
                res.json({
                    success: true,
                    data: result
                });
            } else {
                res.status(404).json({
                    success: false,
                    message: 'Role hero not found'
                });
            }
        } catch (error) {
            console.error('Get role hero by ID error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve role hero'
            });
        }
    }

    async updateRoleHero(req, res, next) {
        try {
            const { id } = req.params;
            const heroData = req.body;
            const adminUsername = req.admin?.username || 'admin';

            const result = await roleHeroService.updateRoleHero(id, heroData, adminUsername);
            res.json(result);
        } catch (error) {
            console.error('Update role hero error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update role hero'
            });
        }
    }

    async deleteRoleHero(req, res, next) {
        try {
            const { id } = req.params;
            const adminUsername = req.admin?.username || 'admin';

            const result = await roleHeroService.deleteRoleHero(id, adminUsername);
            res.json(result);
        } catch (error) {
            console.error('Delete role hero error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete role hero'
            });
        }
    }

    async createRoleHero(req, res, next) {
        try {
            const heroData = req.body;
            const adminUsername = req.admin?.username || 'admin';

            const result = await roleHeroService.createRoleHero(heroData, adminUsername);
            res.json(result);
        } catch (error) {
            console.error('Create role hero error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create role hero'
            });
        }
    }
}

const roleHeroController = new RoleHeroController();
module.exports = roleHeroController;
