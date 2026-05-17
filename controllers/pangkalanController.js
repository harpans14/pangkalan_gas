const { Transaksi, User, Produk, BarangMasuk } = require('../models');
const { Op } = require('sequelize');

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

        produk.stok -= transaksi.jumlah_beli;
        transaksi.status = 'disetujui';
        transaksi.tanda_tangan = ttd_data || null;

        await produk.save();
        await transaksi.save();

        return res.redirect('/pangkalan/pesan-masuk?success=acc_berhasil');
    } catch (error) {
        console.error("ERROR ACC PESANAN:", error);
        return res.redirect('/pangkalan/pesan-masuk?error=server_error');
    }
};

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

exports.kelolaProduk = async (req, res) => {
    const produk = await Produk.findAll({ where: { createdBy: req.session.userId } });
    res.render('pangkalan/kelola_produk', { produk });
};

exports.tambahProduk = async (req, res) => {
    const { nama, harga, stok } = req.body;
    await Produk.create({
        nama,
        harga,
        stok: stok || 0,
        createdBy: req.session.userId
    });
    res.redirect('/pangkalan/kelola-produk');
};

exports.hapusProduk = async (req, res) => {
    const { id } = req.params;
    await Produk.destroy({ where: { id, createdBy: req.session.userId } });
    res.redirect('/pangkalan/kelola-produk');
};

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

        const success = req.query.success || null;
        const error = req.query.error || null;

        res.render('pangkalan/barang_masuk', { barangMasuk, produkList, success, error });
    } catch (error) {
        console.error("ERROR BARANG MASUK:", error);
        res.status(500).send("Gagal memuat data barang masuk: " + error.message);
    }
};

exports.tambahBarangMasuk = async (req, res) => {
    try {
        const { produk_id, jumlah, keterangan, tanggal } = req.body;

        if (!produk_id || !jumlah || jumlah <= 0) {
            return res.redirect('/pangkalan/barang-masuk?error=invalid_input');
        }

        const produk = await Produk.findByPk(produk_id);
        if (!produk) {
            return res.redirect('/pangkalan/barang-masuk?error=produk_tidak_ditemukan');
        }

        const tgl = tanggal || new Date();

        await BarangMasuk.create({
            produk_id,
            jumlah: parseInt(jumlah),
            keterangan: keterangan || null,
            tanggal: tgl,
            createdBy: req.session.userId
        });

        produk.stok += parseInt(jumlah);
        await produk.save();

        return res.redirect('/pangkalan/barang-masuk?success=tambah_berhasil');
    } catch (error) {
        console.error("ERROR TAMBAH BARANG MASUK:", error);
        return res.redirect('/pangkalan/barang-masuk?error=server_error');
    }
};

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

        const selisih = parseInt(jumlah) - barang.jumlah;

        barang.produk_id = produk_id;
        barang.jumlah = parseInt(jumlah);
        barang.keterangan = keterangan || null;
        barang.tanggal = tanggal || barang.tanggal;
        await barang.save();

        const produk = await Produk.findByPk(barang.produk_id);
        if (produk) {
            produk.stok += selisih;
            await produk.save();
        }

        return res.redirect('/pangkalan/barang-masuk?success=edit_berhasil');
    } catch (error) {
        console.error("ERROR EDIT BARANG MASUK:", error);
        return res.redirect('/pangkalan/barang-masuk?error=server_error');
    }
};

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
            produk.stok -= barang.jumlah;
            if (produk.stok < 0) produk.stok = 0;
            await produk.save();
        }

        await barang.destroy();

        return res.redirect('/pangkalan/barang-masuk?success=hapus_berhasil');
    } catch (error) {
        console.error("ERROR HAPUS BARANG MASUK:", error);
        return res.redirect('/pangkalan/barang-masuk?error=server_error');
    }
};
