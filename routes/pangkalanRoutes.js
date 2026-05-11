const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Halaman form pendaftaran
router.get('/daftar-pelanggan', (req, res) => {
    res.render('pangkalan/daftar_pelanggan');
});

// Proses pendaftaran
router.post('/daftar-pelanggan', authController.registerPembeli);

module.exports = router;