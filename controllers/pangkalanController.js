const { Transaksi, User, Stok } = require('../models');

exports.getPesananMasuk = async (req, res) => {
    // Ambil semua pesanan yang statusnya masih 'pending'
    const pesanan = await Transaksi.findAll({
        where: { status: 'pending' }
    });

    // Gabungkan dengan data user secara manual (karena no foreign key)
    const listPesanan = await Promise.all(pesanan.map(async (p) => {
        const user = await User.findByPk(p.user_id);
        return {
            id: p.id,
            nama: user ? user.username : 'Anonim',
            alamat: user ? user.alamat : '-',
            jumlah: p.jumlah_beli,
            metode: p.metode
        };
    }));

    res.render('pangkalan/acc_pesanan', { listPesanan });
};

exports.accPesanan = async (req, res) => {
    const { id_transaksi, ttd_data } = req.body;

    // 1. Update status transaksi jadi ACC dan simpan Tanda Tangan (base64)
    await Transaksi.update(
        { status: 'ACC', tanda_tangan: ttd_data },
        { where: { id: id_transaksi } }
    );

    // 2. Potong stok gas di pangkalan (Logika stok sederhana)
    const transaksi = await Transaksi.findByPk(id_transaksi);
    const stokSaatIni = await Stok.findOne();
    if (stokSaatIni) {
        await stokSaatIni.decrement('jumlah', { by: transaksi.jumlah_beli });
    }

    res.redirect('/pangkalan/pesanan-masuk?success=true');
};