const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { authenticateToken, requireRole, requirePermission } = require('../middlewares/auth');

const gameEquipController = require('../controllers/gameEquip.Controller');

router.use(authenticateToken);

// Get all equip
router.get('/', gameEquipController.getAllEquip);

// Get equip by user id
router.get('/:id', gameEquipController.getEquipByUserId);

// Update equip
router.put('/:id', gameEquipController.updateEquip);

// Delete equip
router.delete('/:id/:equipId', gameEquipController.deleteEquip);

module.exports = router;
