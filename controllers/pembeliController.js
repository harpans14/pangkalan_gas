const { Transaksi, User, LogTabung } = require('../models');
const { Op } = require('sequelize');

exports.getDashboard = async (req, res) => {
    // Simulasi user login (nanti diganti dengan session login beneran)
    // Kita ambil pembeli pertama yang ada di database untuk testing
    const user = await User.findOne({ where: { role: 'pembeli' } });
    if (!user) return res.send("Belum ada pelanggan. Silakan daftar dulu di menu pangkalan.");

    // Logika Hitung Kuota Mingguan
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - 7);

    const totalBeliMingguIni = await Transaksi.sum('jumlah_beli', {
        where: {
            user_id: user.id,
            status: 'ACC',
            createdAt: { [Op.gte]: startOfWeek }
        }
    }) || 0;

    const limit = user.sub_role === 'rumahtangga' ? 1 : 3;
    const sisaKuota = limit - totalBeliMingguIni;

    // Ambil data Simpan/Pinjam Tabung
    const saldoTabung = await LogTabung.sum('jumlah_tabung', { where: { user_id: user.id } }) || 0;

    res.render('pembeli/dashboard', { user, sisaKuota, saldoTabung });
};

exports.pesanGas = async (req, res) => {
    const { user_id, jumlah, metode } = req.body;
    
    // Simpan pesanan dengan status 'pending'
    await Transaksi.create({
        user_id,
        jumlah_beli: jumlah,
        metode,
        status: 'pending',
        tanggal: new Date()
    });

    res.redirect('/pembeli/dashboard?success=true');
};