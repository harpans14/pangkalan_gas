const { User, Transaksi, LogTabung, Produk } = require('../models');
const { Op } = require('sequelize');

exports.getDashboard = async (req, res) => {
    try {
        const userId = req.session.userId;

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).send("User tidak ditemukan!");
        }

        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - 7);

        const totalBeliMingguIni = await Transaksi.sum('jumlah_beli', {
            where: {
                user_id: userId,
                status: 'disetujui',
                createdAt: { [Op.gte]: startOfWeek }
            }
        }) || 0;

        const limit = user.sub_role === 'rumahtangga' ? 1 : 3;
        const sisaKuota = Math.max(0, limit - totalBeliMingguIni);

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

        res.render('pembeli/dashboard', { user, sisaKuota, saldoTabung, daftarProduk, riwayatTransaksi });
    } catch (error) {
        console.error("EROR DASHBOARD:", error);
        res.status(500).send("Detail Error Dashboard: " + error.message);
    }
};

exports.pesanGas = async (req, res) => {
    try {
        const userId = req.session.userId;
        const { produk_id, jumlah, metode } = req.body;

        await Transaksi.create({
            user_id: userId,
            produk_id: produk_id || null,
            jumlah_beli: jumlah,
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
