const gameRankService = require('../services/gameRankService');

class GameRankController {
    async getGameArenaRankAll(req, res, next) {
        try {
            const bigtoken = req.headers.token;
            if (bigtoken !== "bigohm") {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid bigtoken'
                });
            }
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const data = await gameRankService.ArenaRankfindAll(page, limit);
            res.json(data);
        } catch (error) {
            next(error);
        }
    }

    async getGameLvlRankAll(req, res, next) {
        try {
            const bigtoken = req.headers.token;
            if (bigtoken !== "bigohm") {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid bigtoken'
                });
            }
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const data = await gameRankService.lvlRankfindAll(page, limit);
            res.json(data);
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new GameRankController();