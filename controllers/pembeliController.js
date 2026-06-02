const { User, Transaksi, LogTabung, Produk } = require('../models');
const { Op } = require('sequelize');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');
let waNotifier = null;
if (process.env.NODE_ENV !== 'production') {
    waNotifier = require('../utils/waNotifier');
}

exports.getDashboard = async (req, res) => {
    try {
        const userId = req.session.userId;

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).send("User tidak ditemukan!");
        }

        const now = new Date();
        const dayOfWeek = now.getDay();
        const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const monday = new Date(now);
        monday.setDate(now.getDate() - diff);
        monday.setHours(0, 0, 0, 0);

        const produk3Kg = await Produk.findOne({
            where: { nama: { [Op.like]: '%3Kg%' } }
        });

        let total3KgMingguIni = 0;
        let maks3Kg = 0;
        let sisa3Kg = 0;
        if (produk3Kg) {
            if (user.sub_role === 'rumahtangga') {
                maks3Kg = 1;
            } else if (user.sub_role === 'usaha_mikro') {
                maks3Kg = 3;
            }
            const trans3Kg = await Transaksi.findAll({
                where: {
                    user_id: userId,
                    produk_id: produk3Kg.id,
                    status: { [Op.in]: ['pending', 'disetujui', 'selesai'] },
                    createdAt: { [Op.gte]: monday }
                }
            });
            total3KgMingguIni = trans3Kg.reduce((sum, t) => sum + (t.jumlah_beli || 0), 0);
            sisa3Kg = Math.max(0, maks3Kg - total3KgMingguIni);
        }

        const saldoTabung = await LogTabung.sum('jumlah_tabung', {
            where: { user_id: userId }
        }) || 0;

        const daftarProduk = await Produk.findAll();

        const page = parseInt(req.query.page) || 1;
        const limit = 6;
        const offset = (page - 1) * limit;

        const { count: totalItems, rows: riwayatTransaksi } = await Transaksi.findAndCountAll({
            where: { user_id: userId },
            include: [{ model: Produk }],
            order: [['createdAt', 'DESC']],
            limit,
            offset
        });

        const totalPages = Math.ceil(totalItems / limit);

        const success = req.query.success || null;
        const error = req.query.error || null;
        res.render('pembeli/dashboard', { user, saldoTabung, daftarProduk, riwayatTransaksi, success, error, produk3Kg, total3KgMingguIni, maks3Kg, sisa3Kg, currentPage: page, totalPages, totalItems });
    } catch (error) {
        console.error("EROR DASHBOARD:", error);
        res.status(500).send("Detail Error Dashboard: " + error.message);
    }
};

exports.getEditProfil = async (req, res) => {
    try {
        const user = await User.findByPk(req.session.userId);
        if (!user) {
            return res.status(404).send("User tidak ditemukan!");
        }
        res.render('pembeli/edit_profil', { user });
    } catch (error) {
        res.status(500).send("Terjadi kesalahan: " + error.message);
    }
};

exports.updateProfil = async (req, res) => {
    try {
        const userId = req.session.userId;
        const { username, password, alamat } = req.body;
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).send("User tidak ditemukan!");
        }
        user.username = username;
        user.alamat = alamat;
        if (password && password.length >= 6) {
            user.password = await bcrypt.hash(password, 10);
        }
        await user.save();
        req.session.username = username;
        res.redirect('/pembeli/edit-profil?success=true');
    } catch (error) {
        res.status(500).render('pembeli/edit_profil', {
            error: "Terjadi kesalahan: " + error.message,
            user: { username: req.body.username, alamat: req.body.alamat }
        });
    }
};

exports.pesanGas = async (req, res) => {
    try {
        const userId = req.session.userId;
        const { produk_id, jumlah, metode, metode_pembayaran } = req.body;

        const jml = parseInt(jumlah);
        if (!produk_id || isNaN(jml) || jml < 1) {
            return res.redirect('/pembeli/dashboard?error=invalid_input');
        }

        if (!['ambil', 'kirim'].includes(metode)) {
            return res.redirect('/pembeli/dashboard?error=invalid_metode');
        }

        if (!['cod', 'transfer', 'qris'].includes(metode_pembayaran)) {
            return res.redirect('/pembeli/dashboard?error=invalid_metode');
        }

        const produk = await Produk.findByPk(produk_id);
        if (!produk) {
            return res.redirect('/pembeli/dashboard?error=produk_not_found');
        }

        if (produk.stok < jml) {
            return res.redirect('/pembeli/dashboard?error=stok_habis');
        }

        const isGas3Kg = produk.nama.toLowerCase().includes('3kg');

        if (isGas3Kg) {
            const user = await User.findByPk(userId);
            let maks3Kg = 0;
            if (user.sub_role === 'rumahtangga') {
                maks3Kg = 1;
            } else if (user.sub_role === 'usaha_mikro') {
                maks3Kg = 3;
            }

            const now = new Date();
            const dayOfWeek = now.getDay();
            const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
            const monday = new Date(now);
            monday.setDate(now.getDate() - diff);
            monday.setHours(0, 0, 0, 0);

            const trans3Kg = await Transaksi.findAll({
                where: {
                    user_id: userId,
                    produk_id: produk_id,
                    status: { [Op.in]: ['pending', 'disetujui', 'selesai'] },
                    createdAt: { [Op.gte]: monday }
                }
            });
            const sudahBeli = trans3Kg.reduce((sum, t) => sum + (t.jumlah_beli || 0), 0);

            if (sudahBeli + jml > maks3Kg) {
                return res.redirect('/pembeli/dashboard?error=kuota_3kg_habis');
            }
        }

        const statusPembayaran = metode_pembayaran === 'cod' ? 'lunas' : 'belum_bayar';

        const transaksi = await Transaksi.create({
            user_id: userId,
            produk_id: produk_id || null,
            jumlah_beli: jml,
            metode,
            metode_pembayaran,
            status_pembayaran: statusPembayaran,
            status: 'pending',
            tanggal: new Date()
        });

        if (metode === 'kirim') {
            const user = await User.findByPk(userId);
            if (waNotifier) {
                waNotifier.kirimNotifikasiPesanan(user.username, user.alamat, produk.nama, jml)
                    .then(sent => {
                        if (!sent) console.log('[WA] Notifikasi tidak terkirim (client mungkin belum siap)');
                    })
                    .catch(err => console.error('[WA] Gagal kirim notifikasi:', err.message));
            }
        }

        if (metode_pembayaran === 'cod') {
            return res.redirect('/pembeli/dashboard?success=true');
        }

        res.redirect('/pembeli/pembayaran/' + transaksi.id);
    } catch (error) {
        console.error("EROR PESAN GAS:", error);
        res.status(500).send("Detail Error Pesan: " + error.message);
    }
};

exports.getPembayaran = async (req, res) => {
    try {
        const userId = req.session.userId;
        const transaksi = await Transaksi.findByPk(req.params.id, {
            include: [{ model: Produk }]
        });

        if (!transaksi || transaksi.user_id !== userId) {
            return res.status(404).send("Transaksi tidak ditemukan");
        }

        const totalHarga = (transaksi.Produk ? transaksi.Produk.harga : 0) * transaksi.jumlah_beli;
        const error = req.query.error || null;

        res.render('pembeli/pembayaran', { transaksi, totalHarga, error });
    } catch (error) {
        console.error("EROR HALAMAN PEMBAYARAN:", error);
        res.status(500).send("Terjadi kesalahan: " + error.message);
    }
};

exports.uploadBukti = async (req, res) => {
    try {
        if (!req.file) {
            return res.redirect('/pembeli/pembayaran/' + req.params.id + '?error=no_file');
        }

        const userId = req.session.userId;
        const transaksi = await Transaksi.findByPk(req.params.id);

        if (!transaksi || transaksi.user_id !== userId) {
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(404).send("Transaksi tidak ditemukan");
        }

        if (transaksi.status_pembayaran !== 'belum_bayar') {
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
            return res.redirect('/pembeli/pembayaran/' + req.params.id + '?error=sudah_dibayar');
        }

        transaksi.bukti_pembayaran = '/uploads/bukti_pembayaran/' + req.file.filename;
        transaksi.status_pembayaran = 'menunggu_verifikasi';
        await transaksi.save();

        res.redirect('/pembeli/dashboard?success=upload_berhasil');
    } catch (error) {
        console.error("EROR UPLOAD BUKTI:", error);
        if (req.file) {
            try { fs.unlinkSync(req.file.path); } catch (e) {}
        }
        res.status(500).send("Terjadi kesalahan: " + error.message);
    }
};

exports.getStruk = async (req, res) => {
    try {
        const userId = req.session.userId;
        const transaksi = await Transaksi.findByPk(req.params.id, {
            include: [
                { model: User, attributes: ['username', 'alamat'] },
                { model: Produk, attributes: ['nama', 'harga'] }
            ]
        });

        if (!transaksi || transaksi.user_id !== userId) {
            return res.status(404).send("Transaksi tidak ditemukan");
        }

        const totalHarga = (transaksi.Produk ? transaksi.Produk.harga : 0) * transaksi.jumlah_beli;

        res.render('pembeli/struk', { transaksi, totalHarga });
    } catch (error) {
        console.error("EROR STRUK:", error);
        res.status(500).send("Terjadi kesalahan: " + error.message);
    }
};
