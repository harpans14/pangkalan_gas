const { User } = require('../models');
const bcrypt = require('bcrypt');

exports.registerPembeli = async (req, res) => {
    try {
        const { username, password, no_ktp, sub_role, alamat, nomor_hp } = req.body;

        if (!/^\d{16}$/.test(no_ktp)) {
            return res.send("No KTP harus 16 digit angka!");
        }

        const cekUser = await User.findOne({ where: { no_ktp } });
        if (cekUser) {
            return res.send("Gagal: No KTP sudah terdaftar di sistem!");
        }

        if (!['rumahtangga', 'usaha_mikro'].includes(sub_role)) {
            return res.status(400).send("Sub-role tidak valid!");
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await User.create({
            username,
            password: hashedPassword,
            no_ktp,
            role: 'pembeli',
            sub_role,
            alamat,
            nomor_hp: nomor_hp || null
        });

        res.redirect('/pangkalan/daftar-pelanggan?success=true');
    } catch (error) {
        res.status(500).send("Terjadi kesalahan: " + error.message);
    }
};

exports.login = async (req, res) => {
    try {
        const { username, password, role } = req.body;

        const user = await User.findOne({ where: { username, role } });
        if (!user) {
            return res.send("User tidak ditemukan!");
        }

        const cocok = await bcrypt.compare(password, user.password);
        if (!cocok) {
            return res.send("Password salah!");
        }

        req.session.userId = user.id;
        req.session.role = user.role;
        req.session.username = user.username;

        if (user.role === 'pangkalan') {
            res.redirect('/pangkalan/pesan-masuk');
        } else {
            res.redirect('/pembeli/dashboard');
        }
    } catch (error) {
        res.status(500).send("Login error: " + error.message);
    }
};

exports.registerPembeliPublic = async (req, res) => {
    try {
        const { username, password, no_ktp, sub_role, alamat, nomor_hp } = req.body;

        if (!/^\d{16}$/.test(no_ktp)) {
            return res.render('daftar', { error: 'No KTP harus 16 digit angka!' });
        }

        const cekUser = await User.findOne({ where: { no_ktp } });
        if (cekUser) {
            return res.render('daftar', { error: 'No KTP sudah terdaftar di sistem!' });
        }

        if (!['rumahtangga', 'usaha_mikro'].includes(sub_role)) {
            return res.status(400).render('daftar', { error: 'Jenis pelanggan tidak valid!' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await User.create({
            username,
            password: hashedPassword,
            no_ktp,
            role: 'pembeli',
            sub_role,
            alamat,
            nomor_hp: nomor_hp || null
        });

        res.redirect('/login?register=success');
    } catch (error) {
        res.status(500).render('daftar', { error: 'Terjadi kesalahan: ' + error.message });
    }
};

exports.logout = (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
};
