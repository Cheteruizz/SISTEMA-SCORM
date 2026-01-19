// src/routes/scorm_import.routes.js
const express = require('express');
const multer = require('multer');
const router = express.Router();
const scormImportController = require('../controllers/scorm_import.controller');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.post('/importar-manifest', upload.single('manifest'), scormImportController.importarManifest);

const uploadZip = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 },
});

router.post('/importar-zip', uploadZip.single('zip'), scormImportController.importarZip);

module.exports = router;
