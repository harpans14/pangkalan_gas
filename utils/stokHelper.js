const { TabungStok, Produk } = require('../models');
const { Op } = require('sequelize');

const JENIS_TABUNG_LIST = ['3Kg', '5Kg', '12Kg'];

function extractJenisDariNama(nama) {
    if (!nama) return null;
    const normalized = nama.toLowerCase().replace(/\s+/g, '');
    for (const jenis of JENIS_TABUNG_LIST) {
        if (normalized.includes(jenis.toLowerCase())) return jenis;
    }
    return null;
}

async function syncProdukStok(jenis_tabung, produkInstance) {
    const tabungStok = await TabungStok.findOne({ where: { jenis: jenis_tabung } });
    if (!tabungStok) return null;
    const produk = produkInstance || await Produk.findOne({
        where: { nama: { [Op.like]: `%${jenis_tabung}%` } }
    });
    if (produk) {
        produk.stok = Math.max(0, tabungStok.jumlah_isi || 0);
        await produk.save();
        return produk;
    }
    return null;
}

async function cariAtauBuatTabungStok(jenis) {
    let stok = await TabungStok.findOne({ where: { jenis } });
    if (!stok) {
        stok = await TabungStok.create({ jenis, jumlah_isi: 0, jumlah_kosong: 0 });
    }
    return stok;
}

module.exports = {
    JENIS_TABUNG_LIST,
    extractJenisDariNama,
    syncProdukStok,
    cariAtauBuatTabungStok
};
