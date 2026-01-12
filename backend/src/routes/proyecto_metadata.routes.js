// src/routes/proyecto_metadata.routes.js
const express = require('express');
const router = express.Router();
const metadataController = require('../controllers/proyecto_metadata.controller');

router.get('/', metadataController.listarMetadata);
router.get('/:id', metadataController.obtenerMetadata);
router.post('/', metadataController.crearMetadata);
router.put('/:id', metadataController.actualizarMetadata);
router.delete('/:id', metadataController.eliminarMetadata);

module.exports = router;
