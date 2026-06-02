process.on('uncaughtException', err => {
    console.error('[FATAL] Uncaught exception:', err);
});

process.on('unhandledRejection', (reason) => {
    console.error('[FATAL] Unhandled rejection:', reason);
});

const express = require('express');
const path = require('path');
const session = require('express-session');
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const app = express();

const db = require('./models');
const sessionStore = new SequelizeStore({ db: db.sequelize });

let dbReady = false;
const initDbPromise = (async () => {
    try {
        await db.sequelize.authenticate();
        console.log('Database connected successfully.');
        await db.sequelize.sync({ alter: true });
        console.log('Database synced successfully.');
        await sessionStore.sync();
        console.log('Session table synced.');
    } catch (err) {
        console.error('Database connection failed:', err.message);
    }
    dbReady = true;
})();

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

app.use(async (req, res, next) => {
    if (!dbReady) {
        await initDbPromise;
    }
    next();
});

app.use(session({
    secret: process.env.SESSION_SECRET || 'rahasia_pangkalan_gas',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    proxy: true
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

app.use(async (req, res, next) => {
    try {
        let info = await db.WebsiteInfo.findOne();

        if (!info) {
            info = await db.WebsiteInfo.create({
                description: 'Sistem distribusi gas LPG terpercaya untuk memudahkan pengelolaan penjualan, stok, dan laporan pangkalan gas di seluruh Indonesia.',
                address: 'Pangkalan Gas Utama, Kota Bandung, Jawa Barat',
                phone: '085221228806',
                email: 'info@pangkalan-gas.id'
            });
        }

        res.locals.websiteInfo = info;
    } catch (err) {
        console.error('Error loading WebsiteInfo:', err);

        res.locals.websiteInfo = {
            description: 'Sistem distribusi gas LPG terpercaya untuk memudahkan pengelolaan penjualan, stok, dan laporan pangkalan gas di seluruh Indonesia.',
            address: 'Pangkalan Gas Utama, Kota Bandung, Jawa Barat',
            phone: '085221228806',
            email: 'info@pangkalan-gas.id'
        };
    }

    next();
});

app.get('/login', (req, res) => {
    if (req.session.userId) {
        return res.redirect(req.session.role === 'pangkalan' ? '/pangkalan/pesan-masuk' : '/pembeli/dashboard');
    }

    let error = null;

    if (req.query.register === 'success') {
        error = 'Pendaftaran berhasil! Silakan login.';
    }

    res.render('login', { error });
});

app.post('/login', authController.login);
app.get('/logout', authController.logout);

app.get('/daftar', (req, res) => {
    if (req.session.userId) {
        return res.redirect(req.session.role === 'pangkalan' ? '/pangkalan/pesan-masuk' : '/pembeli/dashboard');
    }

    res.render('daftar', { error: null });
});

app.post('/daftar', authController.registerPembeliPublic);

app.post('/pangkalan/daftar-pelanggan', isLoggedIn, isRole('pangkalan'), authController.registerPembeli);

app.use('/pangkalan', isLoggedIn, pangkalanRoutes);
app.use('/pangkalan', isLoggedIn, tabungRoutes);
app.use('/pembeli', isLoggedIn, pembeliRoutes);

app.get('/', async (req, res) => {
    try {
        const banners = await db.CarouselImage.findAll({
            order: [['createdAt', 'DESC']]
        });

        res.render('index', {
            session: req.session,
            banners
        });
    } catch (err) {
        console.error('Error fetching banners:', err);

        res.render('index', {
            session: req.session,
            banners: []
        });
    }
});

module.exports = app;
