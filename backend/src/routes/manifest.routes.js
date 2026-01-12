// src/routes/manifest.routes.js
const express = require('express');
const router = express.Router();
const manifestController = require('../controllers/manifest.controller');

router.get('/', manifestController.listarManifests);
router.get('/:id', manifestController.obtenerManifest);
router.post('/', manifestController.crearManifest);
router.put('/:id', manifestController.actualizarManifest);
router.delete('/:id', manifestController.eliminarManifest);

module.exports = router;
