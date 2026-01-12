// src/routes/scorm.routes.js
const express = require('express');
const router = express.Router();
const scormController = require('../controllers/scorm.controller');

router.post('/:id_proyecto/generar-1-2', scormController.generarPaquete12);
router.post('/:id_proyecto/generar-2004', scormController.generarPaquete2004);

module.exports = router;
