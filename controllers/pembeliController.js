const { User, Transaksi, LogTabung, Produk } = require('../models');
const { Op } = require('sequelize');
const bcrypt = require('bcrypt');

exports.getDashboard = async (req, res) => {
    try {
        const userId = req.session.userId;

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).send("User tidak ditemukan!");
        }

        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - 7);

        const produk3Kg = await Produk.findOne({
            where: { nama: { [Op.like]: '%3Kg%' } }
        });

        let sudahBeli3Kg = false;
        if (produk3Kg) {
            const transaksi3Kg = await Transaksi.findOne({
                where: {
                    user_id: userId,
                    produk_id: produk3Kg.id,
                    status: { [Op.in]: ['pending', 'disetujui', 'selesai'] },
                    createdAt: { [Op.gte]: startOfWeek }
                }
            });
            sudahBeli3Kg = !!transaksi3Kg;
        }

        const saldoTabung = await LogTabung.sum('jumlah_tabung', {
            where: { user_id: userId }
        }) || 0;

        const daftarProduk = await Produk.findAll();

        const riwayatTransaksi = await Transaksi.findAll({
            where: { user_id: userId },
            include: [{ model: Produk }],
            order: [['createdAt', 'DESC']],
            limit: 10
        });

        const success = req.query.success || null;
        const error = req.query.error || null;
        res.render('pembeli/dashboard', { user, saldoTabung, daftarProduk, riwayatTransaksi, success, error, sudahBeli3Kg, produk3Kg });
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
        const { produk_id, jumlah, metode } = req.body;

        const jml = parseInt(jumlah);
        if (!produk_id || isNaN(jml) || jml < 1) {
            return res.redirect('/pembeli/dashboard?error=invalid_input');
        }

        if (!['ambil', 'kirim'].includes(metode)) {
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
            const startOfWeek = new Date();
            startOfWeek.setDate(startOfWeek.getDate() - 7);

            const sudahBeli3Kg = await Transaksi.findOne({
                where: {
                    user_id: userId,
                    produk_id: produk_id,
                    status: { [Op.in]: ['pending', 'disetujui', 'selesai'] },
                    createdAt: { [Op.gte]: startOfWeek }
                }
            });

            if (sudahBeli3Kg) {
                return res.redirect('/pembeli/dashboard?error=kuota_3kg_habis');
            }
        }

        await Transaksi.create({
            user_id: userId,
            produk_id: produk_id || null,
            jumlah_beli: jml,
            metode,
            status: 'pending',
            tanggal: new Date()
        });

        res.redirect('/pembeli/dashboard?success=true');
    } catch (error) {
        console.error("EROR PESAN GAS:", error);
        res.status(500).send("Detail Error Pesan: " + error.message);
    }
};
