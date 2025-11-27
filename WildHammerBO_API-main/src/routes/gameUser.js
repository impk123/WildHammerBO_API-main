const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { authenticateToken, requireRole, requirePermission } = require('../middlewares/auth');

const gameUserController = require('../controllers/gameUser.Controller');

router.use(authenticateToken);

// Get all users
router.get('/', gameUserController.getAllUsers);


module.exports = router;
