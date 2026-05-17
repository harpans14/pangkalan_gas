const { Transaksi, User, Produk, BarangMasuk } = require('../models');
const { Op, fn, col, literal } = require('sequelize');
const PDFDocument = require('pdfkit');

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

async function getDataLaporan(bulan, tahun) {
    const startDate = new Date(tahun, bulan - 1, 1);
    const endDate = new Date(tahun, bulan, 0, 23, 59, 59, 999);

    const statusLaporan = ['disetujui', 'selesai', 'ACC'];

    const transaksi = await Transaksi.findAll({
        where: {
            status: { [Op.in]: statusLaporan },
            createdAt: { [Op.between]: [startDate, endDate] }
        },
        include: [
            { model: User, attributes: ['username', 'alamat'] },
            { model: Produk, attributes: ['nama', 'harga'] }
        ],
        order: [['createdAt', 'ASC']]
    });

    const totalTransaksi = transaksi.length;
    const totalTabung = transaksi.reduce((sum, t) => sum + (t.jumlah_beli || 0), 0);
    const totalPendapatan = transaksi.reduce((sum, t) => {
        return sum + ((t.Produk ? t.Produk.harga : 0) * (t.jumlah_beli || 0));
    }, 0);

    const rekapProduk = {};
    transaksi.forEach(t => {
        const nama = t.Produk ? t.Produk.nama : 'Tanpa Produk';
        const harga = t.Produk ? t.Produk.harga : 0;
        if (!rekapProduk[nama]) {
            rekapProduk[nama] = { nama, harga, jumlah: 0, total: 0 };
        }
        rekapProduk[nama].jumlah += t.jumlah_beli || 0;
        rekapProduk[nama].total += harga * (t.jumlah_beli || 0);
    });
    const rekapProdukArr = Object.values(rekapProduk);

    const pendingCount = await Transaksi.count({
        where: {
            status: 'pending',
            createdAt: { [Op.between]: [startDate, endDate] }
        }
    });

    const ditolakCount = await Transaksi.count({
        where: {
            status: 'ditolak',
            createdAt: { [Op.between]: [startDate, endDate] }
        }
    });

    const bulanList = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    return {
        bulan,
        tahun,
        namaBulan: bulanList[bulan - 1] || '',
        startDate,
        endDate,
        transaksi,
        totalTransaksi,
        totalTabung,
        totalPendapatan,
        rekapProduk: rekapProdukArr,
        pendingCount,
        ditolakCount
    };
}

function formatRupiah(angka) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
}

function formatTanggal(date) {
    return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(date));
}

exports.laporanPenjualan = async (req, res) => {
    try {
        const bulan = parseInt(req.query.bulan) || (new Date().getMonth() + 1);
        const tahun = parseInt(req.query.tahun) || new Date().getFullYear();

        const data = await getDataLaporan(bulan, tahun);

        res.render('pangkalan/laporan', {
            ...data,
            formatRupiah,
            formatTanggal
        });
    } catch (error) {
        console.error("ERROR LAPORAN:", error);
        res.status(500).send("Gagal memuat laporan: " + error.message);
    }
};

exports.downloadLaporanPDF = async (req, res) => {
    try {
        const bulan = parseInt(req.query.bulan) || (new Date().getMonth() + 1);
        const tahun = parseInt(req.query.tahun) || new Date().getFullYear();

        const data = await getDataLaporan(bulan, tahun);

        const doc = new PDFDocument({ layout: 'landscape', margin: 30 });
        const filename = `laporan-penjualan-${String(bulan).padStart(2, '0')}-${tahun}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        doc.pipe(res);

        const font = 'Helvetica';
        const bold = 'Helvetica-Bold';

        doc.fontSize(18).font(bold).text('LAPORAN PENJUALAN BULANAN', { align: 'center' });
        doc.fontSize(12).font(font).text('Sistem Distribusi LPG - Pangkalan Gas', { align: 'center' });
        doc.fontSize(11).font(font).text(`${data.namaBulan} ${data.tahun}`, { align: 'center' });
        doc.moveDown(0.5);

        doc.moveTo(30, doc.y).lineTo(doc.page.width - 30, doc.y).stroke();
        doc.moveDown(0.5);

        doc.fontSize(10).font(font);
        doc.text(`Tanggal Cetak: ${formatTanggal(new Date())}`, { align: 'right' });
        doc.moveDown(0.5);

        doc.fontSize(11).font(bold).text('RINGKASAN');
        doc.moveDown(0.3);

        const ringkasanY = doc.y;
        const col1X = 50;
        const col2X = 250;
        const rowHeight = 18;

        doc.fontSize(10).font(font);
        doc.text('Total Transaksi Berhasil:', col1X, ringkasanY);
        doc.text(`${data.totalTransaksi}`, col2X, ringkasanY);
        doc.text('Total Tabung Terjual:', col1X, ringkasanY + rowHeight);
        doc.text(`${data.totalTabung} Tabung`, col2X, ringkasanY + rowHeight);
        doc.text('Total Pendapatan:', col1X, ringkasanY + rowHeight * 2);
        doc.font(bold).text(`${formatRupiah(data.totalPendapatan)}`, col2X, ringkasanY + rowHeight * 2);
        doc.font(font);
        doc.text('Pesanan Pending:', col1X, ringkasanY + rowHeight * 3);
        doc.text(`${data.pendingCount}`, col2X, ringkasanY + rowHeight * 3);
        doc.text('Pesanan Ditolak:', col1X, ringkasanY + rowHeight * 4);
        doc.text(`${data.ditolakCount}`, col2X, ringkasanY + rowHeight * 4);

        doc.y = ringkasanY + rowHeight * 5 + 10;
        doc.moveTo(30, doc.y).lineTo(doc.page.width - 30, doc.y).stroke();
        doc.moveDown(0.5);

        if (data.rekapProduk.length > 0) {
            doc.fontSize(11).font(bold).text('REKAP PENJUALAN PER PRODUK');
            doc.moveDown(0.3);

            const tableTop = doc.y;
            const colW = [30, 200, 120, 120, 150];
            const colStart = [30, 60, 260, 380, 500];
            const headers = ['No', 'Nama Produk', 'Harga Satuan', 'Jumlah Terjual', 'Total Pendapatan'];

            doc.fontSize(9).font(bold);
            headers.forEach((h, i) => doc.text(h, colStart[i], tableTop, { width: colW[i], align: 'left' }));
            doc.moveDown(0.3);
            doc.fontSize(9).font(font);

            data.rekapProduk.forEach((p, i) => {
                const y = doc.y;
                doc.text(String(i + 1), colStart[0], y, { width: colW[0] });
                doc.text(p.nama, colStart[1], y, { width: colW[1] });
                doc.text(formatRupiah(p.harga), colStart[2], y, { width: colW[2] });
                doc.text(`${p.jumlah} Tabung`, colStart[3], y, { width: colW[3] });
                doc.text(formatRupiah(p.total), colStart[4], y, { width: colW[4] });
                doc.moveDown(0.5);
            });

            doc.moveDown(0.5);
            doc.moveTo(30, doc.y).lineTo(doc.page.width - 30, doc.y).stroke();
            doc.moveDown(0.5);
        }

        if (data.transaksi.length > 0) {
            const needNewPage = doc.y > doc.page.height - 120;
            if (needNewPage) doc.addPage();

            doc.fontSize(11).font(bold).text('DETAIL TRANSAKSI');
            doc.moveDown(0.3);

            const tableTop2 = doc.y;
            const colW2 = [25, 80, 120, 120, 50, 90, 100, 80];
            const colStart2 = [30, 55, 135, 255, 375, 425, 515, 615];
            const headers2 = ['No', 'Tanggal', 'Pembeli', 'Produk', 'Jml', 'Harga', 'Total', 'Status'];

            doc.fontSize(8).font(bold);
            headers2.forEach((h, i) => doc.text(h, colStart2[i], tableTop2, { width: colW2[i], align: 'left' }));
            doc.moveDown(0.3);
            doc.fontSize(8).font(font);

            data.transaksi.forEach((t, i) => {
                if (doc.y > doc.page.height - 40) doc.addPage();
                const y = doc.y;
                doc.text(String(i + 1), colStart2[0], y, { width: colW2[0] });
                doc.text(formatTanggal(t.createdAt), colStart2[1], y, { width: colW2[1] });
                doc.text(t.User ? t.User.username : '-', colStart2[2], y, { width: colW2[2] });
                doc.text(t.Produk ? t.Produk.nama : '-', colStart2[3], y, { width: colW2[3] });
                doc.text(String(t.jumlah_beli), colStart2[4], y, { width: colW2[4] });
                doc.text(t.Produk ? formatRupiah(t.Produk.harga) : '-', colStart2[5], y, { width: colW2[5] });
                const totalHarga = (t.Produk ? t.Produk.harga : 0) * (t.jumlah_beli || 0);
                doc.text(formatRupiah(totalHarga), colStart2[6], y, { width: colW2[6] });
                doc.text(t.status, colStart2[7], y, { width: colW2[7] });
                doc.moveDown(0.4);
            });
        }

        doc.moveDown(1);
        doc.moveTo(30, doc.y).lineTo(doc.page.width - 30, doc.y).stroke();
        doc.moveDown(0.5);
        doc.fontSize(8).font(font).text(`Dicetak dari Sistem Distribusi LPG Pangkalan Gas | ${formatTanggal(new Date())}`, { align: 'center' });

        doc.end();
    } catch (error) {
        console.error("ERROR PDF LAPORAN:", error);
        res.status(500).send("Gagal membuat PDF: " + error.message);
    }
};
