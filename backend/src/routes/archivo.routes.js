// src/routes/archivo.routes.js
const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const router = express.Router();
const archivoController = require('../controllers/archivo.controller');

const baseDir = path.resolve(__dirname, '..');
const uploadDir = process.env.UPLOAD_DIR || path.join(baseDir, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const sanitizeFilename = (name) => {
  const base = path.basename(name);
  return base.replace(/[^A-Za-z0-9._-]/g, '_');
};

const allowedExtensions = new Set([
  '.html',
  '.js',
  '.css',
  '.json',
  '.png',
  '.jpg',
  '.jpeg',
  '.svg',
  '.gif',
  '.mp4',
  '.webm',
  '.mp3',
  '.wav',
  '.pdf',
]);

const isAllowedExtension = (filename) => {
  const ext = path.extname(filename || '').toLowerCase();
  return allowedExtensions.has(ext);
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const safeName = sanitizeFilename(file.originalname);
    const unique = `${Date.now()}_${safeName}`;
    cb(null, unique);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (!isAllowedExtension(file.originalname)) {
      return cb(new Error('Tipo de archivo no permitido'));
    }
    return cb(null, true);
  },
});

router.post('/upload', (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ mensaje: err.message || 'Error al subir archivo' });
    }
    return archivoController.subirArchivo(req, res);
  });
});
router.get('/', archivoController.listarArchivos);
router.get('/:id', archivoController.obtenerArchivo);
router.post('/', archivoController.crearArchivo);
router.put('/:id', archivoController.actualizarArchivo);
router.delete('/:id', archivoController.eliminarArchivo);

module.exports = router;
