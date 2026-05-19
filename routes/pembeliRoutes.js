const express = require('express');
const router = express.Router();
const pembeliController = require('../controllers/pembeliController');
const { isLoggedIn, isRole } = require('../middleware/auth');

router.use(isLoggedIn, isRole('pembeli'));

router.get('/dashboard', pembeliController.getDashboard);
router.get('/edit-profil', pembeliController.getEditProfil);
router.post('/edit-profil', pembeliController.updateProfil);
router.post('/pesan', pembeliController.pesanGas);

module.exports = router;
