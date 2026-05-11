const { User } = require('../models');

exports.registerPembeli = async (req, res) => {
    try {
        const { username, password, no_ktp, sub_role, alamat } = req.body;

        // 1. Cek apakah No KTP sudah ada
        const userExists = await User.findOne({ where: { no_ktp } });
        if (userExists) {
            return res.send("Gagal: No KTP sudah terdaftar di sistem!");
        }

        // 2. Simpan ke Database
        await User.create({
            username,
            password, // Catatan: Harusnya di-hash (bcrypt), tapi untuk belajar ini dulu
            no_ktp,
            role: 'pembeli',
            sub_role, // 'rumahtangga' atau 'usaha_mikro'
            alamat
        });

        res.redirect('/pangkalan/daftar-pelanggan?success=true');
    } catch (error) {
        res.status(500).send("Terjadi kesalahan: " + error.message);
    }
};