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

router.get('/barang-masuk', pangkalanController.getBarangMasuk);
router.post('/tambah-barang-masuk', pangkalanController.tambahBarangMasuk);
router.post('/edit-barang-masuk/:id', pangkalanController.editBarangMasuk);
router.post('/hapus-barang-masuk/:id', pangkalanController.hapusBarangMasuk);

router.get('/laporan', pangkalanController.laporanPenjualan);
router.get('/laporan/pdf', pangkalanController.downloadLaporanPDF);

module.exports = router;
