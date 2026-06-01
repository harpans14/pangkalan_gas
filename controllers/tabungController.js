const { User, TabungStok, TabungTransaksi, Produk } = require('../models');
const { Op } = require('sequelize');
const { syncProdukStok, cariAtauBuatTabungStok } = require('../utils/stokHelper');

exports.getDashboard = async (req, res) => {
    try {
        const stok = await TabungStok.findAll({ order: [['jenis', 'ASC']] });

        const totalIsi = stok.reduce((a, b) => a + (b.jumlah_isi || 0), 0);
        const totalKosong = stok.reduce((a, b) => a + (b.jumlah_kosong || 0), 0);

        const totalTitip = await TabungTransaksi.sum('jumlah', {
            where: { tipe: 'titip', status: 'aktif' }
        }) || 0;
        const totalPinjam = await TabungTransaksi.sum('jumlah', {
            where: { tipe: 'pinjam', status: 'aktif' }
        }) || 0;

        const data = await TabungTransaksi.findAll({
            where: { status: 'aktif' },
            order: [['createdAt', 'DESC']],
            limit: 20
        });

        const belumKembali = data.filter(d => d.status === 'aktif' && d.tipe === 'pinjam');

        const pelangganList = await User.findAll({
            where: { role: 'pembeli' },
            attributes: ['id', 'username', 'no_ktp', 'sub_role'],
            order: [['username', 'ASC']]
        });

        res.render('pangkalan/tabung/index', {
            stok, totalIsi, totalKosong, totalTitip, totalPinjam,
            data, belumKembali, pelangganList,
            success: req.query.success || null, error: req.query.error || null
        });
    } catch (error) {
        console.error("ERROR TABUNG DASHBOARD:", error);
        res.status(500).send("Error: " + error.message);
    }
};

exports.tambah = async (req, res) => {
    try {
        const { tipe, nama_pelanggan, jenis_tabung, jumlah, tanggal, keterangan } = req.body;

        if (!tipe || !nama_pelanggan || !jenis_tabung || !jumlah || !tanggal) {
            return res.redirect('/pangkalan/tabung?error=lengkapi_data');
        }

        const jml = parseInt(jumlah);

        if (tipe === 'pinjam') {
            const stok = await cariAtauBuatTabungStok(jenis_tabung);
            if ((stok.jumlah_kosong || 0) < jml) {
                return res.redirect('/pangkalan/tabung?error=stok_kosong_kurang');
            }
            stok.jumlah_kosong = Math.max(0, (stok.jumlah_kosong || 0) - jml);
            await stok.save();
        }

        await TabungTransaksi.create({
            tipe, nama_pelanggan, jenis_tabung,
            jumlah: jml, tanggal, status: 'aktif',
            keterangan: keterangan || null
        });

        res.redirect('/pangkalan/tabung?success=tambah');
    } catch (error) {
        console.error("ERROR TAMBAH TABUNG:", error);
        res.redirect('/pangkalan/tabung?error=gagal');
    }
};

exports.edit = async (req, res) => {
    try {
        const { id } = req.params;
        const { tipe, nama_pelanggan, jenis_tabung, jumlah, tanggal, status, keterangan } = req.body;

        const trx = await TabungTransaksi.findByPk(id);
        if (!trx) return res.redirect('/pangkalan/tabung?error=tidak_ditemukan');

        if (trx.status === 'selesai') {
            return res.redirect('/pangkalan/tabung?error=tidak_bisa_ubah');
        }

        const oldJenis = trx.jenis_tabung;
        const oldJumlah = trx.jumlah;
        const oldTipe = trx.tipe;
        const newJml = parseInt(jumlah);

        let oldStok = await TabungStok.findOne({ where: { jenis: oldJenis } });
        if (oldStok) {
            if (oldTipe === 'pinjam') {
                oldStok.jumlah_kosong = Math.max(0, (oldStok.jumlah_kosong || 0) + oldJumlah);
                await oldStok.save();
            }
        }

        if (tipe === 'pinjam') {
            const newStok = await cariAtauBuatTabungStok(jenis_tabung);
            if ((newStok.jumlah_kosong || 0) < newJml) {
                return res.redirect('/pangkalan/tabung?error=stok_kosong_kurang');
            }
            newStok.jumlah_kosong = Math.max(0, (newStok.jumlah_kosong || 0) - newJml);
            await newStok.save();
        }

        trx.tipe = tipe;
        trx.nama_pelanggan = nama_pelanggan;
        trx.jenis_tabung = jenis_tabung;
        trx.jumlah = newJml;
        trx.tanggal = tanggal;
        trx.status = status;
        trx.keterangan = keterangan || null;
        await trx.save();

        res.redirect('/pangkalan/tabung?success=edit');
    } catch (error) {
        console.error("ERROR EDIT TABUNG:", error);
        res.redirect('/pangkalan/tabung?error=gagal');
    }
};

exports.hapus = async (req, res) => {
    try {
        const { id } = req.params;
        const trx = await TabungTransaksi.findByPk(id);
        if (!trx) return res.redirect('/pangkalan/tabung?error=tidak_ditemukan');

        if (trx.status === 'aktif' && trx.tipe === 'pinjam') {
            let stok = await TabungStok.findOne({ where: { jenis: trx.jenis_tabung } });
            if (stok) {
                stok.jumlah_kosong = Math.max(0, (stok.jumlah_kosong || 0) + trx.jumlah);
                await stok.save();
            }
        }

        await trx.destroy();
        res.redirect('/pangkalan/tabung?success=hapus');
    } catch (error) {
        console.error("ERROR HAPUS TABUNG:", error);
        res.redirect('/pangkalan/tabung?error=gagal');
    }
};

exports.selesai = async (req, res) => {
    try {
        const { id } = req.params;

        const trx = await TabungTransaksi.findByPk(id);
        if (!trx) return res.redirect('/pangkalan/tabung?error=tidak_ditemukan');
        if (trx.status === 'selesai') return res.redirect('/pangkalan/tabung?error=sudah_selesai');

        if (trx.tipe === 'pinjam') {
            let stok = await TabungStok.findOne({ where: { jenis: trx.jenis_tabung } });
            if (stok) {
                stok.jumlah_kosong = Math.max(0, (stok.jumlah_kosong || 0) + trx.jumlah);
                await stok.save();
            }
        }

        trx.status = 'selesai';
        await trx.save();

        res.redirect('/pangkalan/tabung?success=selesai');
    } catch (error) {
        console.error("ERROR SELESAI TABUNG:", error);
        res.redirect('/pangkalan/tabung?error=gagal');
    }
};
