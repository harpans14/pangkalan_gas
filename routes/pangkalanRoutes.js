const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const pangkalanController = require('../controllers/pangkalanController'); // Import controller baru

// --- FITUR PENDAFTARAN PELANGGAN ---
// Halaman form pendaftaran
router.get('/daftar-pelanggan', (req, res) => {
    res.render('pangkalan/daftar_pelanggan');
});

// Proses pendaftaran
router.post('/daftar-pelanggan', authController.registerPembeli);


// --- FITUR ACC PESANAN & STOK ---
// Halaman daftar pesanan yang masuk dari pembeli (status pending)
router.get('/pesan-masuk', pangkalanController.getPesananMasuk);

// Proses konfirmasi pesanan (Update status ACC + Simpan Tanda Tangan)
router.post('/acc-proses', pangkalanController.accPesanan);


// --- FITUR LAPORAN (OPSIONAL) ---
// Kamu bisa menambahkan ini nanti untuk melihat riwayat penjualan
// router.get('/laporan', pangkalanController.getLaporanPenjualan);

module.exports = router;