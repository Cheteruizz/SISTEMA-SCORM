// src/routes/scorm.routes.js
const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const router = express.Router();
const scormController = require('../controllers/scorm.controller');
const scormImportController = require('../controllers/scorm_import.controller');

const baseDir = path.resolve(__dirname, '..');
const uploadDir = process.env.UPLOAD_DIR || path.join(baseDir, 'uploads');
const importDir = path.join(uploadDir, '_imports');
if (!fs.existsSync(importDir)) {
  fs.mkdirSync(importDir, { recursive: true });
}

const importStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, importDir);
  },
  filename: (req, file, cb) => {
    const safe = path.basename(file.originalname || 'import.zip').replace(/[^A-Za-z0-9._-]/g, '_');
    cb(null, `${Date.now()}_${safe}`);
  },
});

const importUpload = multer({
  storage: importStorage,
  limits: {
    fileSize: 500 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (ext !== '.zip') {
      return cb(new Error('Solo se permiten archivos ZIP'));
    }
    return cb(null, true);
  },
});

router.post('/:id_proyecto/generar-1-2', scormController.generarPaquete12);
router.post('/:id_proyecto/generar-2004', scormController.generarPaquete2004);
router.get('/:id_proyecto/validar', scormController.validarProyecto);
router.get('/:id_proyecto/auditar', scormController.auditarProyecto);
router.post('/import', (req, res) => {
  importUpload.single('file')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ mensaje: err.message || 'Error al importar ZIP' });
    }
    return scormImportController.importarPaquete(req, res);
  });
});

module.exports = router;
