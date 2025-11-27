const express = require('express');
const router = express.Router();
const { getInfo } = require('../controllers/userEvent.Controller');


router.get('/getInfo/:userid', getInfo);

module.exports = router;