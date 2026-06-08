/**
 * Controller Pangkalan (Fitur Utama)
 * =====================================
 * Controller terbesar yang menangani seluruh fitur untuk role 'pangkalan':
 * - Manajemen pesanan masuk (acc/tolak)
 * - Konfirmasi pembayaran
 * - CRUD Produk
 * - Barang masuk (restock)
 * - Transaksi langsung di pangkalan (dengan limit kuota 3Kg)
 * - Laporan penjualan + export PDF
 * - Riwayat transaksi dengan filter & pagination
 * - CRUD Pelanggan
 * - Kelola carousel banner
 * - Kelola info website
 * - Cetak struk
 */

const { Transaksi, User, Produk, BarangMasuk, TabungStok, TabungTransaksi, CarouselImage, WebsiteInfo } = require('../models');
const { Op, fn, col, literal } = require('sequelize');
const PDFDocument = require('pdfkit');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const { extractJenisDariNama, syncProdukStok, cariAtauBuatTabungStok } = require('../utils/stokHelper');

/**
 * MENAMPILKAN PESANAN MASUK
 * Mengambil semua transaksi dengan status 'pending' (menunggu persetujuan)
 * Data ditampilkan dalam bentuk list yang sudah diformat
 */
exports.getPesananMasuk = async (req, res) => {
    try {
        const pesanan = await Transaksi.findAll({
            where: { status: 'pending' },
            include: [
                { model: User, attributes: ['username', 'alamat'] },
                { model: Produk, attributes: ['nama', 'harga', 'stok'] }
            ],
            order: [['createdAt', 'DESC']]
        });

        const listPesanan = pesanan.map(p => ({
            id: p.id,
            nama: p.User ? p.User.username : 'Anonim',
            alamat: p.User ? p.User.alamat : '-',
            produk: p.Produk ? p.Produk.nama : '-',
            produk_id: p.produk_id,
            jumlah: p.jumlah_beli,
            metode: p.metode,
            metode_pembayaran: p.metode_pembayaran,
            status_pembayaran: p.status_pembayaran,
            bukti_pembayaran: p.bukti_pembayaran,
            tanggal: p.createdAt,
            stok_tersedia: p.Produk ? p.Produk.stok : 0
        }));

        const success = req.query.success || null;
        const error = req.query.error || null;

        res.render('pangkalan/acc_pesanan', { listPesanan, success, error });
    } catch (error) {
        console.error("ERROR PESANAN MASUK:", error);
        res.status(500).send("Gagal memuat pesanan: " + error.message);
    }
};

/**
 * MENYETUJUI PESANAN
 * - Validasi transaksi ada & masih pending
 * - Cek stok produk mencukupi
 * - Jika produk adalah tabung gas (3Kg/5Kg/12Kg), kurangi dari stok tabung (jumlah_isi) dan tambah ke jumlah_kosong
 * - Jika bukan tabung, kurangi stok produk biasa
 * - Ubah status transaksi menjadi 'disetujui'
 * - Jika pembayaran sedang menunggu verifikasi, otomatis jadi lunas
 */
exports.accPesanan = async (req, res) => {
    try {
        const { id_transaksi, ttd_data } = req.body;

        if (!id_transaksi) {
            return res.redirect('/pangkalan/pesan-masuk?error=transaksi_tidak_ditemukan');
        }

        const transaksi = await Transaksi.findByPk(id_transaksi);
        if (!transaksi) {
            return res.redirect('/pangkalan/pesan-masuk?error=transaksi_tidak_ditemukan');
        }

        if (transaksi.status !== 'pending') {
            return res.redirect('/pangkalan/pesan-masuk?error=transaksi_sudah_diproses');
        }

        const produk = await Produk.findByPk(transaksi.produk_id);
        if (!produk) {
            return res.redirect('/pangkalan/pesan-masuk?error=produk_tidak_ditemukan');
        }

        if (produk.stok < transaksi.jumlah_beli) {
            return res.redirect('/pangkalan/pesan-masuk?error=stok_tidak_cukup');
        }

        const jenis = extractJenisDariNama(produk.nama);
        if (jenis) {
            const tabungStok = await cariAtauBuatTabungStok(jenis);
            if (tabungStok.jumlah_isi < transaksi.jumlah_beli) {
                return res.redirect('/pangkalan/pesan-masuk?error=stok_tidak_cukup');
            }
            tabungStok.jumlah_isi -= transaksi.jumlah_beli;
            tabungStok.jumlah_kosong += transaksi.jumlah_beli;
            await tabungStok.save();
            await syncProdukStok(jenis);
        } else {
            produk.stok -= transaksi.jumlah_beli;
            await produk.save();
        }

        transaksi.status = 'disetujui';
        transaksi.tanda_tangan = ttd_data || null;
        if (transaksi.status_pembayaran === 'menunggu_verifikasi') {
            transaksi.status_pembayaran = 'lunas';
        }
        await transaksi.save();

        return res.redirect('/pangkalan/pesan-masuk?success=acc_berhasil');
    } catch (error) {
        console.error("ERROR ACC PESANAN:", error);
        return res.redirect('/pangkalan/pesan-masuk?error=server_error');
    }
};

/**
 * MENOLAK PESANAN
 * - Validasi transaksi ada & masih pending
 * - Ubah status transaksi menjadi 'ditolak'
 */
exports.tolakPesanan = async (req, res) => {
    try {
        const { id_transaksi } = req.body;

        if (!id_transaksi) {
            return res.redirect('/pangkalan/pesan-masuk?error=transaksi_tidak_ditemukan');
        }

        const transaksi = await Transaksi.findByPk(id_transaksi);
        if (!transaksi) {
            return res.redirect('/pangkalan/pesan-masuk?error=transaksi_tidak_ditemukan');
        }

        if (transaksi.status !== 'pending') {
            return res.redirect('/pangkalan/pesan-masuk?error=transaksi_sudah_diproses');
        }

        transaksi.status = 'ditolak';
        await transaksi.save();

        return res.redirect('/pangkalan/pesan-masuk?success=tolak_berhasil');
    } catch (error) {
        console.error("ERROR TOLAK PESANAN:", error);
        return res.redirect('/pangkalan/pesan-masuk?error=server_error');
    }
};

/**
 * KONFIRMASI PEMBAYARAN
 * Pembeli sudah upload bukti bayar → pangkalan verifikasi
 * Ubah status_pembayaran dari 'menunggu_verifikasi' menjadi 'lunas'
 */
exports.konfirmasiPembayaran = async (req, res) => {
    try {
        const { id_transaksi } = req.body;

        if (!id_transaksi) {
            return res.redirect('/pangkalan/pesan-masuk?error=transaksi_tidak_ditemukan');
        }

        const transaksi = await Transaksi.findByPk(id_transaksi);
        if (!transaksi) {
            return res.redirect('/pangkalan/pesan-masuk?error=transaksi_tidak_ditemukan');
        }

        if (transaksi.status_pembayaran !== 'menunggu_verifikasi') {
            return res.redirect('/pangkalan/pesan-masuk?error=pembayaran_sudah_dikonfirmasi');
        }

        transaksi.status_pembayaran = 'lunas';
        await transaksi.save();

        return res.redirect('/pangkalan/pesan-masuk?success=pembayaran_dikonfirmasi');
    } catch (error) {
        console.error("ERROR KONFIRMASI PEMBAYARAN:", error);
        return res.redirect('/pangkalan/pesan-masuk?error=server_error');
    }
};

/**
 * MENAMPILKAN HALAMAN KELOLA PRODUK
 * Menampilkan semua produk milik pangkalan yang sedang login
 */
exports.kelolaProduk = async (req, res) => {
    try {
        const produk = await Produk.findAll({ where: { createdBy: req.session.userId } });
        const success = req.query.success || null;
        const error = req.query.error || null;
        res.render('pangkalan/kelola_produk', { produk, success, error, showTambahModal: false, showEditModal: false });
    } catch (error) {
        console.error("ERROR KELOLA PRODUK:", error);
        res.status(500).send("Gagal memuat produk: " + error.message);
    }
};

/**
 * FORM TAMBAH PRODUK (modal)
 * Render halaman dengan showTambahModal = true untuk menampilkan modal tambah
 */
exports.tambahProdukForm = async (req, res) => {
    try {
        res.render('pangkalan/kelola_produk', {
            produk: await Produk.findAll({ where: { createdBy: req.session.userId } }),
            success: null,
            error: null,
            showTambahModal: true
        });
    } catch (error) {
        console.error("ERROR FORM TAMBAH PRODUK:", error);
        res.status(500).send("Gagal memuat form: " + error.message);
    }
};

/**
 * PROSES TAMBAH PRODUK
 * - Validasi nama & harga wajib diisi
 * - Jika ada file upload, simpath path gambar
 * - Simpan produk baru dengan createdBy = session user
 */
exports.tambahProduk = async (req, res) => {
    try {
        const { nama, harga, stok } = req.body;

        if (!nama || !harga) {
            return res.redirect('/pangkalan/kelola-produk?error=invalid_input');
        }

        let gambar = null;
        if (req.file) {
            gambar = '/uploads/produk/' + req.file.filename;
        }

        await Produk.create({
            nama,
            harga: parseInt(harga) || 0,
            stok: parseInt(stok) || 0,
            gambar,
            createdBy: req.session.userId
        });

        res.redirect('/pangkalan/kelola-produk?success=tambah');
    } catch (error) {
        console.error("ERROR TAMBAH PRODUK:", error);
        res.redirect('/pangkalan/kelola-produk?error=gagal');
    }
};

/**
 * FORM EDIT PRODUK (modal)
 * Cari produk berdasarkan id, render dengan showEditModal = id produk
 */
exports.editProdukForm = async (req, res) => {
    try {
        const { id } = req.params;
        const produkEdit = await Produk.findOne({ where: { id, createdBy: req.session.userId } });
        if (!produkEdit) {
            return res.redirect('/pangkalan/kelola-produk?error=not_found');
        }

        const produk = await Produk.findAll({ where: { createdBy: req.session.userId } });
        res.render('pangkalan/kelola_produk', {
            produk,
            success: null,
            error: null,
            showEditModal: id
        });
    } catch (error) {
        console.error("ERROR FORM EDIT PRODUK:", error);
        res.status(500).send("Gagal memuat form: " + error.message);
    }
};

/**
 * PROSES EDIT PRODUK
 * - Validasi input
 * - Update field nama, harga, stok
 * - Jika upload gambar baru, hapus gambar lama dari disk & simpan yang baru
 */
exports.editProduk = async (req, res) => {
    try {
        const { id } = req.params;
        const { nama, harga, stok } = req.body;

        if (!nama || !harga) {
            return res.redirect('/pangkalan/kelola-produk?error=invalid_input');
        }

        const produk = await Produk.findOne({ where: { id, createdBy: req.session.userId } });
        if (!produk) {
            return res.redirect('/pangkalan/kelola-produk?error=not_found');
        }

        produk.nama = nama;
        produk.harga = parseInt(harga) || 0;
        if (stok !== undefined && stok !== null && stok !== '') {
            produk.stok = parseInt(stok) || 0;
        }

        if (req.file) {
            if (produk.gambar) {
                const oldPath = path.join(__dirname, '..', 'public', produk.gambar);
                if (fs.existsSync(oldPath)) {
                    try { fs.unlinkSync(oldPath); } catch (e) { console.error('Failed to delete old image:', e); }
                }
            }
            produk.gambar = '/uploads/produk/' + req.file.filename;
        }

        await produk.save();

        res.redirect('/pangkalan/kelola-produk?success=edit');
    } catch (error) {
        console.error("ERROR EDIT PRODUK:", error);
        res.redirect('/pangkalan/kelola-produk?error=gagal');
    }
};

/**
 * HAPUS PRODUK
 * - Hapus file gambar dari disk jika ada
 * - Hapus data produk dari database
 */
exports.hapusProduk = async (req, res) => {
    try {
        const { id } = req.params;
        const produk = await Produk.findOne({ where: { id, createdBy: req.session.userId } });
        if (!produk) {
            return res.redirect('/pangkalan/kelola-produk?error=not_found');
        }

        if (produk.gambar) {
            const filePath = path.join(__dirname, '..', 'public', produk.gambar);
            if (fs.existsSync(filePath)) {
                try { fs.unlinkSync(filePath); } catch (e) { console.error('Failed to delete product image:', e); }
            }
        }

        await produk.destroy();
        res.redirect('/pangkalan/kelola-produk?success=hapus');
    } catch (error) {
        console.error("ERROR HAPUS PRODUK:", error);
        res.redirect('/pangkalan/kelola-produk?error=gagal');
    }
};

/**
 * MENAMPILKAN BARANG MASUK (RESTOCK)
 * Menampilkan histori barang masuk beserta daftar produk & stok tabung
 */
exports.getBarangMasuk = async (req, res) => {
    try {
        const barangMasuk = await BarangMasuk.findAll({
            include: [
                { model: Produk, attributes: ['nama', 'harga'] },
                { model: User, attributes: ['username'] }
            ],
            order: [['createdAt', 'DESC']]
        });

        const produkList = await Produk.findAll({ where: { createdBy: req.session.userId } });

        const tabungStokList = await TabungStok.findAll();

        const success = req.query.success || null;
        const error = req.query.error || null;

        res.render('pangkalan/barang_masuk', { barangMasuk, produkList, tabungStokList, success, error });
    } catch (error) {
        console.error("ERROR BARANG MASUK:", error);
        res.status(500).send("Gagal memuat data barang masuk: " + error.message);
    }
};

/**
 * TAMBAH BARANG MASUK (RESTOCK)
 * - Validasi input
 * - Simpan catatan barang masuk
 * - Jika produk adalah tabung gas: kurangi stok_kosong, tambah stok_isi, lalu sinkronisasi
 * - Jika bukan tabung: langsung tambah stok produk
 */
exports.tambahBarangMasuk = async (req, res) => {
    try {
        const { produk_id, jumlah, keterangan, tanggal } = req.body;

        const jml = parseInt(jumlah);
        if (!produk_id || isNaN(jml) || jml <= 0) {
            return res.redirect('/pangkalan/barang-masuk?error=invalid_input');
        }

        const produk = await Produk.findByPk(produk_id);
        if (!produk) {
            return res.redirect('/pangkalan/barang-masuk?error=produk_tidak_ditemukan');
        }

        const tgl = tanggal || new Date();

        await BarangMasuk.create({
            produk_id,
            jumlah: jml,
            keterangan: keterangan || null,
            tanggal: tgl,
            createdBy: req.session.userId
        });

        const jenis = extractJenisDariNama(produk.nama);
        if (jenis) {
            const tabungStok = await cariAtauBuatTabungStok(jenis);
            if ((tabungStok.jumlah_kosong || 0) < jml) {
                return res.redirect('/pangkalan/barang-masuk?error=stok_kosong_tidak_cukup');
            }
            tabungStok.jumlah_kosong = (tabungStok.jumlah_kosong || 0) - jml;
            tabungStok.jumlah_isi = (tabungStok.jumlah_isi || 0) + jml;
            await tabungStok.save();
            await syncProdukStok(jenis);
        } else {
            produk.stok += jml;
            await produk.save();
        }

        return res.redirect('/pangkalan/barang-masuk?success=tambah_berhasil');
    } catch (error) {
        console.error("ERROR TAMBAH BARANG MASUK:", error);
        return res.redirect('/pangkalan/barang-masuk?error=server_error');
    }
};

/**
 * EDIT BARANG MASUK
 * Mengubah data barang masuk dan menyesuaikan stok:
 * - Jika produk berubah: kurangi stok produk lama, tambah stok produk baru
 * - Jika produk sama: sesuaikan selisih jumlah
 * Mendukung stok tabung (3Kg/5Kg/12Kg) dan stok produk biasa
 */
exports.editBarangMasuk = async (req, res) => {
    try {
        const { id } = req.params;
        const { produk_id, jumlah, keterangan, tanggal } = req.body;

        const barang = await BarangMasuk.findByPk(id, {
            include: [{ model: Produk }]
        });

        if (!barang) {
            return res.redirect('/pangkalan/barang-masuk?error=not_found');
        }

        const oldJumlah = barang.jumlah;
        const oldProdukId = barang.produk_id;
        const newJumlah = parseInt(jumlah);
        const newProdukId = parseInt(produk_id);
        if (isNaN(newJumlah) || newJumlah < 0 || isNaN(newProdukId)) {
            return res.redirect('/pangkalan/barang-masuk?error=invalid_input');
        }

        if (oldProdukId !== newProdukId) {
            const oldProduk = await Produk.findByPk(oldProdukId);
            if (oldProduk) {
                const oldJenis = extractJenisDariNama(oldProduk.nama);
                if (oldJenis) {
                    const oldStok = await cariAtauBuatTabungStok(oldJenis);
                    oldStok.jumlah_isi = Math.max(0, (oldStok.jumlah_isi || 0) - oldJumlah);
                    await oldStok.save();
                    await syncProdukStok(oldJenis);
                } else {
                    oldProduk.stok = Math.max(0, (oldProduk.stok || 0) - oldJumlah);
                    await oldProduk.save();
                }
            }

            const newProduk = await Produk.findByPk(newProdukId);
            if (newProduk) {
                const newJenis = extractJenisDariNama(newProduk.nama);
                if (newJenis) {
                    const newStok = await cariAtauBuatTabungStok(newJenis);
                    newStok.jumlah_isi = (newStok.jumlah_isi || 0) + newJumlah;
                    await newStok.save();
                    await syncProdukStok(newJenis);
                } else {
                    newProduk.stok = (newProduk.stok || 0) + newJumlah;
                    await newProduk.save();
                }
            }
        } else {
            const produk = await Produk.findByPk(oldProdukId);
            if (produk) {
                const selisih = newJumlah - oldJumlah;
                const jenis = extractJenisDariNama(produk.nama);
                if (jenis) {
                    const tabungStok = await cariAtauBuatTabungStok(jenis);
                    tabungStok.jumlah_isi = Math.max(0, (tabungStok.jumlah_isi || 0) + selisih);
                    await tabungStok.save();
                    await syncProdukStok(jenis);
                } else {
                    produk.stok = Math.max(0, (produk.stok || 0) + selisih);
                    await produk.save();
                }
            }
        }

        barang.produk_id = newProdukId;
        barang.jumlah = newJumlah;
        barang.keterangan = keterangan || null;
        barang.tanggal = tanggal || barang.tanggal;
        await barang.save();

        return res.redirect('/pangkalan/barang-masuk?success=edit_berhasil');
    } catch (error) {
        console.error("ERROR EDIT BARANG MASUK:", error);
        return res.redirect('/pangkalan/barang-masuk?error=server_error');
    }
};

/**
 * HAPUS BARANG MASUK
 * Menghapus data barang masuk dan mengembalikan stok (dikurangi)
 */
exports.hapusBarangMasuk = async (req, res) => {
    try {
        const { id } = req.params;

        const barang = await BarangMasuk.findByPk(id, {
            include: [{ model: Produk }]
        });

        if (!barang) {
            return res.redirect('/pangkalan/barang-masuk?error=not_found');
        }

        const produk = await Produk.findByPk(barang.produk_id);
        if (produk) {
            const jenis = extractJenisDariNama(produk.nama);
            if (jenis) {
                const tabungStok = await cariAtauBuatTabungStok(jenis);
                tabungStok.jumlah_isi = Math.max(0, (tabungStok.jumlah_isi || 0) - barang.jumlah);
                await tabungStok.save();
                await syncProdukStok(jenis);
            } else {
                produk.stok = Math.max(0, (produk.stok || 0) - barang.jumlah);
                await produk.save();
            }
        }

        await barang.destroy();

        return res.redirect('/pangkalan/barang-masuk?success=hapus_berhasil');
    } catch (error) {
        console.error("ERROR HAPUS BARANG MASUK:", error);
        return res.redirect('/pangkalan/barang-masuk?error=server_error');
    }
};

/**
 * MENAMPILKAN DAFTAR PELANGGAN
 * Ambil semua user dengan role 'pembeli', kecuali field password
 */
exports.daftarPelanggan = async (req, res) => {
    try {
        const pelanggan = await User.findAll({
            where: { role: 'pembeli' },
            attributes: { exclude: ['password'] },
            order: [['createdAt', 'DESC']]
        });

        const success = req.query.success || null;
        const error = req.query.error || null;

        res.render('pangkalan/daftar_pelanggan', { pelanggan, success, error });
    } catch (error) {
        console.error("ERROR DAFTAR PELANGGAN:", error);
        res.status(500).send("Gagal memuat data pelanggan: " + error.message);
    }
};

/**
 * EDIT DATA PELANGGAN
 * - Validasi pelanggan ada
 * - Jika No KTP diubah, cek duplikasi
 * - Validasi sub_role
 * - Jika password diisi, hash ulang; jika kosong, password tetap
 */
exports.editPelanggan = async (req, res) => {
    try {
        const { id } = req.params;
        const { username, password, no_ktp, sub_role, alamat, nomor_hp } = req.body;

        const pelanggan = await User.findByPk(id);
        if (!pelanggan || pelanggan.role !== 'pembeli') {
            return res.redirect('/pangkalan/daftar-pelanggan?error=not_found');
        }

        if (no_ktp !== pelanggan.no_ktp) {
            const cekKtp = await User.findOne({ where: { no_ktp } });
            if (cekKtp) {
                return res.redirect('/pangkalan/daftar-pelanggan?error=ktp_duplikat');
            }
        }

        if (!['rumahtangga', 'usaha_mikro'].includes(sub_role)) {
            return res.redirect('/pangkalan/daftar-pelanggan?error=invalid_sub_role');
        }

        pelanggan.username = username;
        pelanggan.no_ktp = no_ktp;
        pelanggan.sub_role = sub_role;
        pelanggan.alamat = alamat;
        pelanggan.nomor_hp = nomor_hp || null;

        if (password && password.trim() !== '') {
            pelanggan.password = await bcrypt.hash(password, 10);
        }

        await pelanggan.save();

        return res.redirect('/pangkalan/daftar-pelanggan?success=edit_berhasil');
    } catch (error) {
        console.error("ERROR EDIT PELANGGAN:", error);
        return res.redirect('/pangkalan/daftar-pelanggan?error=server_error');
    }
};

/**
 * HAPUS PELANGGAN
 * Hapus user dengan role pembeli dari database
 */
exports.hapusPelanggan = async (req, res) => {
    try {
        const { id } = req.params;

        const pelanggan = await User.findByPk(id);
        if (!pelanggan || pelanggan.role !== 'pembeli') {
            return res.redirect('/pangkalan/daftar-pelanggan?error=not_found');
        }

        await pelanggan.destroy();

        return res.redirect('/pangkalan/daftar-pelanggan?success=hapus_berhasil');
    } catch (error) {
        console.error("ERROR HAPUS PELANGGAN:", error);
        return res.redirect('/pangkalan/daftar-pelanggan?error=server_error');
    }
};

/**
 * HALAMAN TRANSAKSI LANGSUNG
 * Pangkalan melayani pembelian langsung di lokasi:
 * - Cari pelanggan berdasarkan No KTP (via query parameter)
 * - Tampilkan kuota 3Kg mingguan (rumahtangga = 1, usaha_mikro = 3)
 * - Tampilkan riwayat 5 transaksi terakhir pelanggan
 * - Tampilkan daftar produk yang tersedia
 */
exports.transaksiLangsung = async (req, res) => {
    try {
        const { no_ktp } = req.query;
        let pelanggan = null;
        let riwayatTransaksi = [];
        let totalMingguIni = 0;
        let found = false;
        let searched = !!no_ktp;
        let produk3Kg = null;
        let total3KgMingguIni = 0;
        let maks3Kg = 0;
        let sisa3Kg = 0;

        if (no_ktp) {
            pelanggan = await User.findOne({
                where: { no_ktp, role: 'pembeli' },
                attributes: { exclude: ['password'] }
            });

            if (pelanggan) {
                found = true;

                const now = new Date();
                const dayOfWeek = now.getDay();
                const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                const monday = new Date(now);
                monday.setDate(now.getDate() - diff);
                monday.setHours(0, 0, 0, 0);

                const transMingguIni = await Transaksi.findAll({
                    where: {
                        user_id: pelanggan.id,
                        status: { [Op.in]: ['ACC', 'disetujui', 'selesai'] },
                        createdAt: { [Op.gte]: monday }
                    }
                });
                totalMingguIni = transMingguIni.reduce((sum, t) => sum + (t.jumlah_beli || 0), 0);

                produk3Kg = await Produk.findOne({
                    where: { nama: { [Op.like]: '%3Kg%' } }
                });
                if (produk3Kg) {
                    if (pelanggan.sub_role === 'rumahtangga') {
                        maks3Kg = 1;
                    } else if (pelanggan.sub_role === 'usaha_mikro') {
                        maks3Kg = 3;
                    }
                    const trans3Kg = transMingguIni.filter(t => t.produk_id === produk3Kg.id);
                    total3KgMingguIni = trans3Kg.reduce((sum, t) => sum + (t.jumlah_beli || 0), 0);
                    sisa3Kg = Math.max(0, maks3Kg - total3KgMingguIni);
                }

                riwayatTransaksi = await Transaksi.findAll({
                    where: { user_id: pelanggan.id },
                    include: [{ model: Produk, attributes: ['nama', 'harga'] }],
                    order: [['createdAt', 'DESC']],
                    limit: 5
                });
            }
        }

        const produkList = await Produk.findAll({ where: { createdBy: req.session.userId } });

        const success = req.query.success || null;
        const error = req.query.error || null;

        res.render('pangkalan/transaksi_langsung', {
            pelanggan,
            riwayatTransaksi,
            totalMingguIni,
            produk3Kg,
            total3KgMingguIni,
            maks3Kg,
            sisa3Kg,
            cariKtp: no_ktp || '',
            found,
            searched,
            produkList,
            success,
            error,
            formatRupiah,
            formatTanggal
        });
    } catch (error) {
        console.error("ERROR TRANSAKSI LANGSUNG:", error);
        res.status(500).send("Gagal memuat halaman: " + error.message);
    }
};

/**
 * PROSES TRANSAKSI LANGSUNG
 * Pangkalan memproses pembelian langsung:
 * - Validasi pelanggan & produk
 * - Cek stok tersedia
 * - Cek kuota 3Kg mingguan (rumahtangga max 1, usaha_mikro max 3)
 * - Kurangi stok tabung (jumlah_isi → jumlah_kosong) atau stok produk biasa
 * - Simpan transaksi dengan status 'selesai' langsung (tanpa perlu acc)
 */
exports.prosesTransaksiLangsung = async (req, res) => {
    try {
        const { user_id, produk_id, jumlah_beli } = req.body;

        if (!user_id || !produk_id || !jumlah_beli || parseInt(jumlah_beli) <= 0) {
            return res.redirect('/pangkalan/transaksi-langsung?error=invalid_input');
        }

        const pelanggan = await User.findByPk(user_id);
        if (!pelanggan || pelanggan.role !== 'pembeli') {
            return res.redirect('/pangkalan/transaksi-langsung?error=pelanggan_tidak_ditemukan');
        }

        const produk = await Produk.findByPk(produk_id);
        if (!produk) {
            return res.redirect('/pangkalan/transaksi-langsung?error=produk_tidak_ditemukan');
        }

        const jml = parseInt(jumlah_beli);

        if (produk.stok < jml) {
            return res.redirect('/pangkalan/transaksi-langsung?error=stok_tidak_cukup&no_ktp=' + encodeURIComponent(pelanggan.no_ktp));
        }

        const isGas3Kg = produk.nama.toLowerCase().includes('3kg');
        if (isGas3Kg) {
            const now = new Date();
            const dayOfWeek = now.getDay();
            const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
            const monday = new Date(now);
            monday.setDate(now.getDate() - diff);
            monday.setHours(0, 0, 0, 0);

            const transMingguIni = await Transaksi.findAll({
                where: {
                    user_id: pelanggan.id,
                    status: { [Op.in]: ['ACC', 'disetujui', 'selesai'] },
                    createdAt: { [Op.gte]: monday }
                }
            });
            const produk3Kg = await Produk.findOne({
                where: { nama: { [Op.like]: '%3Kg%' } }
            });
            const trans3Kg = produk3Kg ? transMingguIni.filter(t => t.produk_id === produk3Kg.id) : [];
            const total3Kg = trans3Kg.reduce((sum, t) => sum + (t.jumlah_beli || 0), 0);
            const maks3Kg = pelanggan.sub_role === 'rumahtangga' ? 1 : pelanggan.sub_role === 'usaha_mikro' ? 3 : 0;
            const sisa3Kg = Math.max(0, maks3Kg - total3Kg);

            if (jml > sisa3Kg) {
                return res.redirect('/pangkalan/transaksi-langsung?error=kuota_habis&no_ktp=' + encodeURIComponent(pelanggan.no_ktp));
            }
        }

        const jenis = require('../utils/stokHelper').extractJenisDariNama(produk.nama);
        if (jenis) {
            const { cariAtauBuatTabungStok, syncProdukStok } = require('../utils/stokHelper');
            const tabungStok = await cariAtauBuatTabungStok(jenis);
            if (tabungStok.jumlah_isi < jml) {
                return res.redirect('/pangkalan/transaksi-langsung?error=stok_tidak_cukup&no_ktp=' + encodeURIComponent(pelanggan.no_ktp));
            }
            tabungStok.jumlah_isi -= jml;
            tabungStok.jumlah_kosong += jml;
            await tabungStok.save();
            await syncProdukStok(jenis);
        } else {
            produk.stok -= jml;
            await produk.save();
        }

        await Transaksi.create({
            user_id: pelanggan.id,
            produk_id: produk.id,
            jumlah_beli: jml,
            metode: 'ambil',
            status: 'selesai',
            tanggal: new Date()
        });

        return res.redirect('/pangkalan/transaksi-langsung?success=transaksi_berhasil&no_ktp=' + encodeURIComponent(pelanggan.no_ktp));
    } catch (error) {
        console.error("ERROR PROSES TRANSAKSI LANGSUNG:", error);
        return res.redirect('/pangkalan/transaksi-langsung?error=server_error');
    }
};

/**
 * AMBIL DATA LAPORAN BULANAN
 * Helper function untuk mengambil data transaksi per bulan:
 * - Filter transaksi dengan status berhasil (disetujui/selesai/ACC)
 * - Hitung total transaksi, total tabung terjual, total pendapatan
 * - Rekap per produk
 * - Hitung juga pesanan pending & ditolak di periode yang sama
 */
async function getDataLaporan(bulan, tahun) {
    const startDate = new Date(tahun, bulan - 1, 1);
    const endDate = new Date(tahun, bulan, 0, 23, 59, 59, 999);

    const statusLaporan = ['disetujui', 'selesai', 'ACC'];

    const transaksi = await Transaksi.findAll({
        where: {
            status: { [Op.in]: statusLaporan },
            createdAt: { [Op.between]: [startDate, endDate] }
        },
        include: [
            { model: User, attributes: ['username', 'alamat'] },
            { model: Produk, attributes: ['nama', 'harga'] }
        ],
        order: [['createdAt', 'ASC']]
    });

    const totalTransaksi = transaksi.length;
    const totalTabung = transaksi.reduce((sum, t) => sum + (t.jumlah_beli || 0), 0);
    const totalPendapatan = transaksi.reduce((sum, t) => {
        return sum + ((t.Produk ? t.Produk.harga : 0) * (t.jumlah_beli || 0));
    }, 0);

    const rekapProduk = {};
    transaksi.forEach(t => {
        const nama = t.Produk ? t.Produk.nama : 'Tanpa Produk';
        const harga = t.Produk ? t.Produk.harga : 0;
        if (!rekapProduk[nama]) {
            rekapProduk[nama] = { nama, harga, jumlah: 0, total: 0 };
        }
        rekapProduk[nama].jumlah += t.jumlah_beli || 0;
        rekapProduk[nama].total += harga * (t.jumlah_beli || 0);
    });
    const rekapProdukArr = Object.values(rekapProduk);

    const pendingCount = await Transaksi.count({
        where: {
            status: 'pending',
            createdAt: { [Op.between]: [startDate, endDate] }
        }
    });

    const ditolakCount = await Transaksi.count({
        where: {
            status: 'ditolak',
            createdAt: { [Op.between]: [startDate, endDate] }
        }
    });

    const bulanList = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    return {
        bulan,
        tahun,
        namaBulan: bulanList[bulan - 1] || '',
        startDate,
        endDate,
        transaksi,
        totalTransaksi,
        totalTabung,
        totalPendapatan,
        rekapProduk: rekapProdukArr,
        pendingCount,
        ditolakCount
    };
}

/**
 * FORMAT RUPIAH
 * Ubah angka ke format mata uang IDR (contoh: Rp 50.000)
 */
function formatRupiah(angka) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
}

/**
 * FORMAT TANGGAL INDONESIA
 * Ubah date ke format Indonesia (contoh: 1 Januari 2024)
 */
function formatTanggal(date) {
    return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(date));
}

/**
 * HALAMAN LAPORAN PENJUALAN
 * Tampilkan laporan penjualan berdasarkan bulan & tahun (default: bulan saat ini)
 */
exports.laporanPenjualan = async (req, res) => {
    try {
        const bulan = parseInt(req.query.bulan) || (new Date().getMonth() + 1);
        const tahun = parseInt(req.query.tahun) || new Date().getFullYear();

        const data = await getDataLaporan(bulan, tahun);

        res.render('pangkalan/laporan', {
            ...data,
            formatRupiah,
            formatTanggal
        });
    } catch (error) {
        console.error("ERROR LAPORAN:", error);
        res.status(500).send("Gagal memuat laporan: " + error.message);
    }
};

/**
 * DOWNLOAD LAPORAN PDF
 * Generate PDF laporan penjualan bulanan menggunakan PDFKit:
 * - Layout landscape
 * - Bagian Ringkasan (total transaksi, tabung terjual, pendapatan, pending, ditolak)
 * - Tabel Rekap per Produk
 * - Tabel Detail Transaksi (No, Tanggal, Pembeli, Produk, Jml, Harga, Total, Status)
 * - Auto page break jika konten melebihi satu halaman
 */
exports.downloadLaporanPDF = async (req, res) => {
    try {
        const bulan = parseInt(req.query.bulan) || (new Date().getMonth() + 1);
        const tahun = parseInt(req.query.tahun) || new Date().getFullYear();

        const data = await getDataLaporan(bulan, tahun);

        const doc = new PDFDocument({ layout: 'landscape', margin: 30 });
        const filename = `laporan-penjualan-${String(bulan).padStart(2, '0')}-${tahun}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        doc.pipe(res);

        const font = 'Helvetica';
        const bold = 'Helvetica-Bold';

        doc.fontSize(18).font(bold).text('LAPORAN PENJUALAN BULANAN', { align: 'center' });
        doc.fontSize(12).font(font).text('Sistem Distribusi LPG - Pangkalan Gas', { align: 'center' });
        doc.fontSize(11).font(font).text(`${data.namaBulan} ${data.tahun}`, { align: 'center' });
        doc.moveDown(0.5);

        doc.moveTo(30, doc.y).lineTo(doc.page.width - 30, doc.y).stroke();
        doc.moveDown(0.5);

        doc.fontSize(10).font(font);
        doc.text(`Tanggal Cetak: ${formatTanggal(new Date())}`, { align: 'right' });
        doc.moveDown(0.5);

        doc.fontSize(11).font(bold).text('RINGKASAN');
        doc.moveDown(0.3);

        const ringkasanY = doc.y;
        const col1X = 50;
        const col2X = 250;
        const rowHeight = 18;

        doc.fontSize(10).font(font);
        doc.text('Total Transaksi Berhasil:', col1X, ringkasanY);
        doc.text(`${data.totalTransaksi}`, col2X, ringkasanY);
        doc.text('Total Tabung Terjual:', col1X, ringkasanY + rowHeight);
        doc.text(`${data.totalTabung} Tabung`, col2X, ringkasanY + rowHeight);
        doc.text('Total Pendapatan:', col1X, ringkasanY + rowHeight * 2);
        doc.font(bold).text(`${formatRupiah(data.totalPendapatan)}`, col2X, ringkasanY + rowHeight * 2);
        doc.font(font);
        doc.text('Pesanan Pending:', col1X, ringkasanY + rowHeight * 3);
        doc.text(`${data.pendingCount}`, col2X, ringkasanY + rowHeight * 3);
        doc.text('Pesanan Ditolak:', col1X, ringkasanY + rowHeight * 4);
        doc.text(`${data.ditolakCount}`, col2X, ringkasanY + rowHeight * 4);

        doc.y = ringkasanY + rowHeight * 5 + 10;
        doc.moveTo(30, doc.y).lineTo(doc.page.width - 30, doc.y).stroke();
        doc.moveDown(0.5);

        if (data.rekapProduk.length > 0) {
            doc.fontSize(11).font(bold).text('REKAP PENJUALAN PER PRODUK');
            doc.moveDown(0.3);

            const tableTop = doc.y;
            const colW = [30, 200, 120, 120, 150];
            const colStart = [30, 60, 260, 380, 500];
            const headers = ['No', 'Nama Produk', 'Harga Satuan', 'Jumlah Terjual', 'Total Pendapatan'];

            doc.fontSize(9).font(bold);
            headers.forEach((h, i) => doc.text(h, colStart[i], tableTop, { width: colW[i], align: 'left' }));
            doc.moveDown(0.3);
            doc.fontSize(9).font(font);

            data.rekapProduk.forEach((p, i) => {
                const y = doc.y;
                doc.text(String(i + 1), colStart[0], y, { width: colW[0] });
                doc.text(p.nama, colStart[1], y, { width: colW[1] });
                doc.text(formatRupiah(p.harga), colStart[2], y, { width: colW[2] });
                doc.text(`${p.jumlah} Tabung`, colStart[3], y, { width: colW[3] });
                doc.text(formatRupiah(p.total), colStart[4], y, { width: colW[4] });
                doc.moveDown(0.5);
            });

            doc.moveDown(0.5);
            doc.moveTo(30, doc.y).lineTo(doc.page.width - 30, doc.y).stroke();
            doc.moveDown(0.5);
        }

        if (data.transaksi.length > 0) {
            const needNewPage = doc.y > doc.page.height - 120;
            if (needNewPage) doc.addPage();

            doc.fontSize(11).font(bold).text('DETAIL TRANSAKSI');
            doc.moveDown(0.3);

            const tableTop2 = doc.y;
            const colW2 = [25, 80, 120, 120, 50, 90, 100, 80];
            const colStart2 = [30, 55, 135, 255, 375, 425, 515, 615];
            const headers2 = ['No', 'Tanggal', 'Pembeli', 'Produk', 'Jml', 'Harga', 'Total', 'Status'];

            doc.fontSize(8).font(bold);
            headers2.forEach((h, i) => doc.text(h, colStart2[i], tableTop2, { width: colW2[i], align: 'left' }));
            doc.moveDown(0.3);
            doc.fontSize(8).font(font);

            data.transaksi.forEach((t, i) => {
                if (doc.y > doc.page.height - 40) doc.addPage();
                const y = doc.y;
                doc.text(String(i + 1), colStart2[0], y, { width: colW2[0] });
                doc.text(formatTanggal(t.createdAt), colStart2[1], y, { width: colW2[1] });
                doc.text(t.User ? t.User.username : '-', colStart2[2], y, { width: colW2[2] });
                doc.text(t.Produk ? t.Produk.nama : '-', colStart2[3], y, { width: colW2[3] });
                doc.text(String(t.jumlah_beli), colStart2[4], y, { width: colW2[4] });
                doc.text(t.Produk ? formatRupiah(t.Produk.harga) : '-', colStart2[5], y, { width: colW2[5] });
                const totalHarga = (t.Produk ? t.Produk.harga : 0) * (t.jumlah_beli || 0);
                doc.text(formatRupiah(totalHarga), colStart2[6], y, { width: colW2[6] });
                doc.text(t.status, colStart2[7], y, { width: colW2[7] });
                doc.moveDown(0.4);
            });
        }

        doc.moveDown(1);
        doc.moveTo(30, doc.y).lineTo(doc.page.width - 30, doc.y).stroke();
        doc.moveDown(0.5);
        doc.fontSize(8).font(font).text(`Dicetak dari Sistem Distribusi LPG Pangkalan Gas | ${formatTanggal(new Date())}`, { align: 'center' });

        doc.end();
    } catch (error) {
        console.error("ERROR PDF LAPORAN:", error);
        res.status(500).send("Gagal membuat PDF: " + error.message);
    }
};

/**
 * RIWAYAT TRANSAKSI (dengan filter & pagination)
 * Menampilkan semua transaksi dengan fitur:
 * - Filter status (pending/disetujui/ditolak/selesai)
 * - Filter bulan & tahun
 * - Pencarian berdasarkan nama pembeli
 * - Pagination (15 data per halaman)
 * - Menampilkan total tabung & total pendapatan dari hasil filter
 */
exports.getRiwayatTransaksi = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 15;
        const offset = (page - 1) * limit;

        const statusFilter = req.query.status || '';
        const bulan = parseInt(req.query.bulan) || '';
        const tahun = parseInt(req.query.tahun) || '';
        const search = req.query.search || '';

        const where = {};
        const userWhere = {};

        if (statusFilter) {
            where.status = statusFilter;
        }

        if (search) {
            userWhere.username = { [Op.like]: `%${search}%` };
        }

        if (bulan && tahun) {
            const startDate = new Date(tahun, bulan - 1, 1);
            const endDate = new Date(tahun, bulan, 0, 23, 59, 59, 999);
            where.createdAt = { [Op.between]: [startDate, endDate] };
        } else if (tahun) {
            const startDate = new Date(tahun, 0, 1);
            const endDate = new Date(tahun, 11, 31, 23, 59, 59, 999);
            where.createdAt = { [Op.between]: [startDate, endDate] };
        }

        const includeUser = { model: User, attributes: ['username', 'alamat', 'no_ktp', 'sub_role'] };
        if (Object.keys(userWhere).length > 0) {
            includeUser.where = userWhere;
        }

        const { count: totalItems, rows: transaksi } = await Transaksi.findAndCountAll({
            where,
            include: [
                includeUser,
                { model: Produk, attributes: ['nama', 'harga'] }
            ],
            order: [['createdAt', 'DESC']],
            limit,
            offset,
            distinct: true
        });

        const totalPages = Math.ceil(totalItems / limit);

        const totalTabung = transaksi.reduce((sum, t) => sum + (t.jumlah_beli || 0), 0);
        const totalPendapatan = transaksi.reduce((sum, t) => {
            return sum + ((t.Produk ? t.Produk.harga : 0) * (t.jumlah_beli || 0));
        }, 0);

        const bulanList = [
            'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ];

        const success = req.query.success || null;
        const error = req.query.error || null;

        res.render('pangkalan/riwayat_transaksi', {
            transaksi,
            totalItems,
            totalPages,
            currentPage: page,
            totalTabung,
            totalPendapatan,
            statusFilter,
            bulan,
            tahun,
            search,
            bulanList,
            formatRupiah,
            formatTanggal,
            success,
            error
        });
    } catch (error) {
        console.error("ERROR RIWAYAT TRANSAKSI:", error);
        res.status(500).send("Gagal memuat riwayat transaksi: " + error.message);
    }
};

/**
 * CETAK STRUK TRANSAKSI
 * Menampilkan struk pembelian berdasarkan ID transaksi
 * (Digunakan oleh pangkalan & pembeli)
 */
exports.getStruk = async (req, res) => {
    try {
        const transaksi = await Transaksi.findByPk(req.params.id, {
            include: [
                { model: User, attributes: ['username', 'alamat'] },
                { model: Produk, attributes: ['nama', 'harga'] }
            ]
        });

        if (!transaksi) {
            return res.status(404).send("Transaksi tidak ditemukan");
        }

        const totalHarga = (transaksi.Produk ? transaksi.Produk.harga : 0) * transaksi.jumlah_beli;

        res.render('pembeli/struk', { transaksi, totalHarga });
    } catch (error) {
        console.error("ERROR STRUK:", error);
        res.status(500).send("Gagal memuat struk: " + error.message);
    }
};

/**
 * MENAMPILKAN HALAMAN KELOLA CAROUSEL
 * Menampilkan daftar banner yang tampil di halaman utama (index)
 */
exports.getCarousel = async (req, res) => {
    try {
        const banners = await CarouselImage.findAll({ order: [['createdAt', 'DESC']] });
        const success = req.query.success || null;
        const error = req.query.error || null;
        res.render('pangkalan/kelola_carousel', { banners, success, error });
    } catch (error) {
        console.error("ERROR GET CAROUSEL:", error);
        res.status(500).send("Gagal memuat kelola banner: " + error.message);
    }
};

/**
 * UPLOAD GAMBAR CAROUSEL
 * Menambahkan banner baru (gambar + judul + deskripsi)
 */
exports.uploadCarousel = async (req, res) => {
    try {
        const { title, description } = req.body;
        if (!req.file) {
            return res.redirect('/pangkalan/carousel?error=no_file');
        }

        const imageUrl = '/uploads/carousel/' + req.file.filename;

        await CarouselImage.create({
            imageUrl,
            title: title || null,
            description: description || null
        });

        return res.redirect('/pangkalan/carousel?success=tambah');
    } catch (error) {
        console.error("ERROR UPLOAD CAROUSEL:", error);
        return res.redirect('/pangkalan/carousel?error=gagal');
    }
};

/**
 * HAPUS GAMBAR CAROUSEL
 * Hapus file dari disk & hapus record dari database
 */
exports.deleteCarousel = async (req, res) => {
    try {
        const { id } = req.params;
        const banner = await CarouselImage.findByPk(id);
        if (!banner) {
            return res.redirect('/pangkalan/carousel?error=not_found');
        }

        const filePath = path.join(__dirname, '..', 'public', banner.imageUrl);

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        await banner.destroy();
        return res.redirect('/pangkalan/carousel?success=hapus');
    } catch (error) {
        console.error("ERROR DELETE CAROUSEL:", error);
        return res.redirect('/pangkalan/carousel?error=gagal');
    }
};

/**
 * UPDATE INFO WEBSITE
 * Mengubah deskripsi, alamat, telepon, email yang tampil di footer & halaman utama
 */
exports.updateWebsiteInfo = async (req, res) => {
    try {
        const { description, address, phone, email } = req.body;
        
        let info = await WebsiteInfo.findOne();
        if (!info) {
            await WebsiteInfo.create({ description, address, phone, email });
        } else {
            info.description = description;
            info.address = address;
            info.phone = phone;
            info.email = email;
            await info.save();
        }

        return res.redirect('/pangkalan/carousel?success=info_edit');
    } catch (error) {
        console.error("ERROR UPDATE WEBSITE INFO:", error);
        return res.redirect('/pangkalan/carousel?error=gagal');
    }
};
