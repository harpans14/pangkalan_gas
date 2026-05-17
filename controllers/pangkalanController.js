const { Transaksi, User, Produk } = require('../models');

exports.getPesananMasuk = async (req, res) => {
    const pesanan = await Transaksi.findAll({
        where: { status: 'pending' },
        include: [
            { model: User, attributes: ['username', 'alamat'] },
            { model: Produk, attributes: ['nama', 'harga'] }
        ],
        order: [['createdAt', 'DESC']]
    });

    const listPesanan = pesanan.map(p => ({
        id: p.id,
        nama: p.User ? p.User.username : 'Anonim',
        alamat: p.User ? p.User.alamat : '-',
        produk: p.Produk ? p.Produk.nama : '-',
        jumlah: p.jumlah_beli,
        metode: p.metode
    }));

    res.render('pangkalan/acc_pesanan', { listPesanan });
};

exports.accPesanan = async (req, res) => {
    const { id_transaksi, ttd_data } = req.body;

    await Transaksi.update(
        { status: 'ACC', tanda_tangan: ttd_data },
        { where: { id: id_transaksi } }
    );

    const transaksi = await Transaksi.findByPk(id_transaksi);

    if (transaksi.produk_id) {
        const produk = await Produk.findByPk(transaksi.produk_id);
        if (produk) {
            await produk.decrement('stok', { by: transaksi.jumlah_beli });
        }
    }

    res.redirect('/pangkalan/pesan-masuk?success=true');
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
