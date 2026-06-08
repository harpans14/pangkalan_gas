/**
 * Controller Autentikasi & Registrasi
 * =====================================
 * Bertugas menangani:
 * - Login user (pangkalan & pembeli)
 * - Logout user
 * - Registrasi pembeli oleh pangkalan (dari halaman internal)
 * - Registrasi pembeli oleh publik (dari halaman daftar umum)
 */

const { User } = require('../models');
const bcrypt = require('bcrypt');

/**
 * REGISTRASI PEMBELI OLEH PANGKALAN
 * Dipanggil dari halaman daftar pelanggan di panel pangkalan
 * - Validasi No KTP harus 16 digit angka
 * - Cek duplikasi No KTP
 * - Validasi sub_role harus 'rumahtangga' atau 'usaha_mikro'
 * - Hash password dengan bcrypt
 * - Simpan user dengan role 'pembeli'
 */
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

/**
 * LOGIN USER
 * - Cari user berdasarkan username
 * - Cocokkan password dengan bcrypt
 * - Simpan session: userId, role, username
 * - Redirect sesuai role (pangkalan → pesan-masuk, pembeli → dashboard)
 */
exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;

        const user = await User.findOne({ where: { username } });
        if (!user) {
            return res.render('login', { error: 'User tidak ditemukan!' });
        }

        const cocok = await bcrypt.compare(password, user.password);
        if (!cocok) {
            return res.render('login', { error: 'Password salah!' });
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

/**
 * REGISTRASI PEMBELI OLEH PUBLIK
 * Dipanggil dari halaman /daftar (umum)
 * - Sama seperti registerPembeli, tapi redirect ke halaman login
 * - Menampilkan error di halaman daftar (render) bukan redirect
 */
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

/**
 * LOGOUT
 * - Hancurkan session
 * - Redirect ke halaman utama (/)
 */
exports.logout = (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
};
