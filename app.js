const express = require('express');
const path = require('path');
const session = require('express-session');
const app = express();

// 1. Import Rute
const pangkalanRoutes = require('./routes/pangkalanRoutes');
const pembeliRoutes = require('./routes/pembeliRoutes'); // Rute pembeli ditambahkan

// 2. Konfigurasi EJS & Body Parser
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: false }));
app.use(express.json()); 
app.use(express.static(path.join(__dirname, 'public')));

// 3. Konfigurasi Session
app.use(session({
    secret: 'rahasia_pangkalan_gas',
    resave: false,
    saveUninitialized: true
}));

// 4. Import Models
const db = require('./models');

// 5. Gunakan Rute
app.use('/pangkalan', pangkalanRoutes);
app.use('/pembeli', pembeliRoutes); // Rute pembeli diaktifkan

// Route Utama/Landing Page
app.get('/', (req, res) => {
    res.render('index'); 
});

// 6. Jalankan Server & Sinkronisasi Database
const PORT = 3000;
db.sequelize.sync().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
        console.log(`📝 Daftar pelanggan: http://localhost:3000/pangkalan/daftar-pelanggan`);
        console.log(`🛒 Dashboard pembeli: http://localhost:3000/pembeli/dashboard`);
    });
}).catch(err => {
    console.error('Gagal koneksi database:', err);
});