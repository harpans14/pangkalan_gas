const express = require('express');
const path = require('path');
const session = require('express-session');
const app = express();

const pangkalanRoutes = require('./routes/pangkalanRoutes');
const pembeliRoutes = require('./routes/pembeliRoutes');
const tabungRoutes = require('./routes/tabungRoutes');
const authController = require('./controllers/authController');
const { isLoggedIn, isRole } = require('./middleware/auth');

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

app.use((req, res, next) => {
    const originalRender = res.render.bind(res);
    res.render = function(view, options, callback) {
        if (typeof options === 'function') {
            callback = options;
            options = {};
        }
        options = options || {};
        options.session = req.session || {};
        options.username = (req.session && req.session.username) || 'Admin';
        options.success = options.success !== undefined ? options.success : null;
        options.error = options.error !== undefined ? options.error : null;
        return originalRender(view, options, callback);
    };
    next();
});

app.get('/login', (req, res) => {
    let error = null;
    if (req.query.register === 'success') {
        error = 'Pendaftaran berhasil! Silakan login.';
    }
    res.render('login', { error });
});
app.post('/login', authController.login);
app.get('/logout', authController.logout);

app.get('/daftar', (req, res) => {
    res.render('daftar', { error: null });
});
app.post('/daftar', authController.registerPembeliPublic);

app.post('/pangkalan/daftar-pelanggan', isLoggedIn, isRole('pangkalan'), authController.registerPembeli);

app.use('/pangkalan', isLoggedIn, pangkalanRoutes);
app.use('/pangkalan', isLoggedIn, tabungRoutes);
app.use('/pembeli', isLoggedIn, pembeliRoutes);

app.get('/', (req, res) => {
    res.render('index', { session: req.session });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Login: http://localhost:3000/login`);
});
