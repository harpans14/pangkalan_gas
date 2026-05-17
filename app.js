const express = require('express');
const path = require('path');
const session = require('express-session');
const app = express();

const pangkalanRoutes = require('./routes/pangkalanRoutes');
const pembeliRoutes = require('./routes/pembeliRoutes');
const authController = require('./controllers/authController');
const { isLoggedIn } = require('./middleware/auth');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: 'rahasia_pangkalan_gas',
    resave: false,
    saveUninitialized: true
}));

app.get('/login', (req, res) => {
    res.render('login', { error: null });
});
app.post('/login', authController.login);
app.get('/logout', authController.logout);

app.get('/pangkalan/daftar-pelanggan', (req, res) => {
    res.render('pangkalan/daftar_pelanggan');
});
app.post('/pangkalan/daftar-pelanggan', authController.registerPembeli);

app.use('/pangkalan', isLoggedIn, pangkalanRoutes);
app.use('/pembeli', isLoggedIn, pembeliRoutes);

app.get('/', (req, res) => {
    res.render('index', { session: req.session });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Login: http://localhost:3000/login`);
});
