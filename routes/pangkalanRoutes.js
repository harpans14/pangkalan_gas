const express = require('express');
const router = express.Router();
const pangkalanController = require('../controllers/pangkalanController');
const { isLoggedIn, isRole } = require('../middleware/auth');

router.use(isLoggedIn, isRole('pangkalan'));

router.get('/pesan-masuk', pangkalanController.getPesananMasuk);
router.post('/acc-proses', pangkalanController.accPesanan);
router.post('/tolak-proses', pangkalanController.tolakPesanan);
router.get('/kelola-produk', pangkalanController.kelolaProduk);
router.post('/tambah-produk', pangkalanController.tambahProduk);
router.post('/hapus-produk/:id', pangkalanController.hapusProduk);

module.exports = router;
