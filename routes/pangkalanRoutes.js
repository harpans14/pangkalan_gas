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

router.get('/transaksi-langsung', pangkalanController.transaksiLangsung);
router.post('/transaksi-langsung/proses', pangkalanController.prosesTransaksiLangsung);

router.get('/daftar-pelanggan', pangkalanController.daftarPelanggan);
router.post('/edit-pelanggan/:id', pangkalanController.editPelanggan);
router.post('/hapus-pelanggan/:id', pangkalanController.hapusPelanggan);

module.exports = router;
