const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { authenticateToken, requireRole, requirePermission } = require('../middlewares/auth');

const gameServersController = require('../controllers/gameServers.Controller');

router.use(authenticateToken);

// Get all game servers
router.get('/', gameServersController.getAllGameServers);

module.exports = router;