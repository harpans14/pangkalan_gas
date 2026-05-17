const express = require('express');
const router = express.Router();
const pembeliController = require('../controllers/pembeliController');

router.get('/dashboard', pembeliController.getDashboard);
router.post('/pesan', pembeliController.pesanGas);

module.exports = router;
