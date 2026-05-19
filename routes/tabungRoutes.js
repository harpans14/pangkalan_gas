const express = require('express');
const router = express.Router();
const tabungController = require('../controllers/tabungController');
const { isLoggedIn, isRole } = require('../middleware/auth');

router.use(isLoggedIn, isRole('pangkalan'));

router.get('/tabung', tabungController.getDashboard);
router.post('/tabung/tambah', tabungController.tambah);
router.post('/tabung/edit/:id', tabungController.edit);
router.post('/tabung/hapus/:id', tabungController.hapus);
router.post('/tabung/selesai/:id', tabungController.selesai);

module.exports = router;
