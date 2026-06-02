const express = require('express');
const router = express.Router();
const pangkalanController = require('../controllers/pangkalanController');
const { isLoggedIn, isRole } = require('../middleware/auth');
const upload = require('../utils/upload');

router.use(isLoggedIn, isRole('pangkalan'));

router.get('/pesan-masuk', pangkalanController.getPesananMasuk);
router.get('/struk/:id', pangkalanController.getStruk);
router.post('/acc-proses', pangkalanController.accPesanan);
router.post('/tolak-proses', pangkalanController.tolakPesanan);
router.post('/konfirmasi-pembayaran', pangkalanController.konfirmasiPembayaran);
router.get('/kelola-produk', pangkalanController.kelolaProduk);
router.get('/produk/tambah', pangkalanController.tambahProdukForm);
router.post('/produk/tambah', upload.uploadProduk.single('gambar'), pangkalanController.tambahProduk);
router.get('/produk/edit/:id', pangkalanController.editProdukForm);
router.post('/produk/edit/:id', upload.uploadProduk.single('gambar'), pangkalanController.editProduk);
router.post('/produk/hapus/:id', pangkalanController.hapusProduk);

// Legacy route kept for backward compatibility
router.post('/edit-produk/:id', upload.uploadProduk.single('gambar'), pangkalanController.editProduk);

// Carousel Management Routes
router.get('/carousel', pangkalanController.getCarousel);
router.post('/carousel/upload', upload.uploadCarousel.single('image'), pangkalanController.uploadCarousel);
router.post('/carousel/delete/:id', pangkalanController.deleteCarousel);
router.post('/carousel/info', pangkalanController.updateWebsiteInfo);

router.get('/barang-masuk', pangkalanController.getBarangMasuk);
router.post('/tambah-barang-masuk', pangkalanController.tambahBarangMasuk);

router.get('/riwayat-transaksi', pangkalanController.getRiwayatTransaksi);
router.get('/laporan', pangkalanController.laporanPenjualan);
router.get('/laporan/pdf', pangkalanController.downloadLaporanPDF);

router.get('/transaksi-langsung', pangkalanController.transaksiLangsung);
router.post('/transaksi-langsung/proses', pangkalanController.prosesTransaksiLangsung);

router.get('/daftar-pelanggan', pangkalanController.daftarPelanggan);
router.post('/edit-pelanggan/:id', pangkalanController.editPelanggan);
router.post('/hapus-pelanggan/:id', pangkalanController.hapusPelanggan);

module.exports = router;
