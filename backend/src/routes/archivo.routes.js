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

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}_${file.originalname}`;
    cb(null, unique);
  },
});

const upload = multer({ storage });

router.post('/upload', upload.single('file'), archivoController.subirArchivo);
router.get('/', archivoController.listarArchivos);
router.get('/:id', archivoController.obtenerArchivo);
router.post('/', archivoController.crearArchivo);
router.put('/:id', archivoController.actualizarArchivo);
router.delete('/:id', archivoController.eliminarArchivo);

module.exports = router;
