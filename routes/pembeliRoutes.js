const express = require('express');
const router = express.Router();
const pembeliController = require('../controllers/pembeliController');
const { isLoggedIn, isRole } = require('../middleware/auth');

router.use(isLoggedIn, isRole('pembeli'));

router.get('/dashboard', pembeliController.getDashboard);
router.post('/pesan', pembeliController.pesanGas);

module.exports = router;
