const GameServersService = require('../services/gameServersService');

class GameServersController {
    async getAllGameServers(req, res, next) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const filters = req.query.filters ? JSON.parse(req.query.filters) : {};

            const result = await GameServersService.getAllGameServers(page, limit, filters);

            res.json(result);
        } catch (error) {
            console.error('Get all users error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve users'
            });
        }
    }
}

const gameServersController = new GameServersController();
module.exports = gameServersController;