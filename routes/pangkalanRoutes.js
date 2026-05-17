const express = require('express');
const router = express.Router();
const pangkalanController = require('../controllers/pangkalanController');

router.get('/pesan-masuk', pangkalanController.getPesananMasuk);
router.post('/acc-proses', pangkalanController.accPesanan);
router.get('/kelola-produk', pangkalanController.kelolaProduk);
router.post('/tambah-produk', pangkalanController.tambahProduk);
router.post('/hapus-produk/:id', pangkalanController.hapusProduk);

module.exports = router;
