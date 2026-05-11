const db = require('../models');
const { Op } = require('sequelize');

// Mengambil model langsung dari instance sequelize untuk menghindari masalah import
const User = db.sequelize.models.User;
const Transaksi = db.sequelize.models.Transaksi;
const LogTabung = db.sequelize.models.LogTabung;

// 1. Fungsi Tampilan Dashboard
exports.getDashboard = async (req, res) => {
    try {
        console.log("Cek Koneksi Model - User:", !!User);

        if (!User) {
            return res.status(500).send("Model User tidak ditemukan. Cek folder models!");
        }

        // Ambil data pembeli pertama untuk simulasi
        const user = await User.findOne({ where: { role: 'pembeli' } });
        
        if (!user) {
            return res.send("Belum ada pelanggan. Silakan daftar dulu di menu pangkalan.");
        }

        // Hitung Kuota Mingguan
        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - 7);

        let totalBeliMingguIni = 0;
        if (Transaksi) {
            totalBeliMingguIni = await Transaksi.sum('jumlah_beli', {
                where: {
                    user_id: user.id,
                    status: 'ACC',
                    createdAt: { [Op.gte]: startOfWeek }
                }
            }) || 0;
        }

        const limit = user.sub_role === 'rumahtangga' ? 1 : 3;
        const sisaKuota = limit - totalBeliMingguIni;

        let saldoTabung = 0;
        if (LogTabung) {
            saldoTabung = await LogTabung.sum('jumlah_tabung', { where: { user_id: user.id } }) || 0;
        }

        res.render('pembeli/dashboard', { user, sisaKuota, saldoTabung });
    } catch (error) {
        console.error("EROR DASHBOARD:", error);
        res.status(500).send("Detail Error Dashboard: " + error.message);
    }
};

// 2. Fungsi Proses Pesan Gas (WAJIB ADA AGAR ROUTE TIDAK ERROR)
exports.pesanGas = async (req, res) => {
    try {
        const { user_id, jumlah, metode } = req.body;

        if (!Transaksi) {
            return res.status(500).send("Model Transaksi belum dibuat!");
        }

        await Transaksi.create({
            user_id,
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