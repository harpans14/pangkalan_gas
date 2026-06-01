const express = require('express');
const router = express.Router();
const pembeliController = require('../controllers/pembeliController');
const { isLoggedIn, isRole } = require('../middleware/auth');
const upload = require('../utils/upload');

router.use(isLoggedIn, isRole('pembeli'));

router.get('/dashboard', pembeliController.getDashboard);
router.get('/edit-profil', pembeliController.getEditProfil);
router.post('/edit-profil', pembeliController.updateProfil);
router.post('/pesan', pembeliController.pesanGas);
router.get('/pembayaran/:id', pembeliController.getPembayaran);
router.get('/struk/:id', pembeliController.getStruk);
router.post('/upload-bukti/:id', (req, res, next) => {
    upload.single('bukti_pembayaran')(req, res, (err) => {
        if (err) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.redirect('/pembeli/pembayaran/' + req.params.id + '?error=no_file');
            }
            return res.redirect('/pembeli/pembayaran/' + req.params.id + '?error=no_file');
        }
        next();
    });
}, pembeliController.uploadBukti);

module.exports = router;
