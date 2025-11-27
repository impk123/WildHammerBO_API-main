const gameEquipService = require('../services/gameEquipService');

class GameEquipController {
    async getAllEquip(req, res, next) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const filters = req.query.filters ? JSON.parse(req.query.filters) : {};

            const result = await gameEquipService.getAllEquip(page, limit, filters);

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
            console.error('Get all equip error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve equipment'
            });
        }
    }

    async getEquipByUserId(req, res, next) {
        try {
            const { id } = req.params;
            const result = await gameEquipService.getEquipByUserId(id);
            
            res.json({
                success: true,
                data: result,
                userId: id
            });
        } catch (error) {
            console.error('Get equip by user ID error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve user equipment'
            });
        }
    }

    async updateEquip(req, res, next) {
        try {
            const { id } = req.params;
            const equipData = req.body;
            const adminUsername = req.admin?.username || 'admin';

            const result = await gameEquipService.updateEquip(id, equipData, adminUsername);
            res.json(result);
        } catch (error) {
            console.error('Update equip error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update equipment'
            });
        }
    }

    async deleteEquip(req, res, next) {
        try {
            const { id, equipId } = req.params;
            const adminUsername = req.admin?.username || 'admin';

            const result = await gameEquipService.deleteEquip(id, equipId, adminUsername);
            res.json(result);
        } catch (error) {
            console.error('Delete equip error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete equipment'
            });
        }
    }
}


const gameEquipController = new GameEquipController();
module.exports = gameEquipController;