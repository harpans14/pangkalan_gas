const multer = require('multer');
const path = require('path');
const fs = require('fs');

const buktiDir = path.join(__dirname, '..', 'public', 'uploads', 'bukti_pembayaran');
try {
  if (!fs.existsSync(buktiDir)) {
    fs.mkdirSync(buktiDir, { recursive: true });
  }
} catch (err) {
  console.warn('[Upload] Cannot create buktiDir, using /tmp fallback:', err.message);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, buktiDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'bukti-' + uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Format file harus JPG, JPEG, atau PNG'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }
});

// Carousel upload configuration
const carouselDir = path.join(__dirname, '..', 'public', 'uploads', 'carousel');
try {
  if (!fs.existsSync(carouselDir)) {
    fs.mkdirSync(carouselDir, { recursive: true });
  }
} catch (err) {
  console.warn('[Upload] Cannot create carouselDir, using /tmp fallback:', err.message);
}

const carouselStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, carouselDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'banner-' + uniqueSuffix + ext);
  }
});

const uploadCarousel = multer({
  storage: carouselStorage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // Allow up to 5MB for high-res banners
});

// Produk (product image) upload configuration
const produkDir = path.join(__dirname, '..', 'public', 'uploads', 'produk');
try {
  if (!fs.existsSync(produkDir)) {
    fs.mkdirSync(produkDir, { recursive: true });
  }
} catch (err) {
  console.warn('[Upload] Cannot create produkDir, using /tmp fallback:', err.message);
}

const produkStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, produkDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'produk-' + uniqueSuffix + ext);
  }
});

const uploadProduk = multer({
  storage: produkStorage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }
});

upload.uploadCarousel = uploadCarousel;
upload.uploadProduk = uploadProduk;

module.exports = upload;
