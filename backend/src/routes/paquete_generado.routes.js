// src/routes/paquete_generado.routes.js
const express = require('express');
const router = express.Router();
const paqueteController = require('../controllers/paquete_generado.controller');

router.get('/', paqueteController.listarPaquetes);
router.get('/:id', paqueteController.obtenerPaquete);
router.post('/', paqueteController.crearPaquete);
router.put('/:id', paqueteController.actualizarPaquete);
router.delete('/:id', paqueteController.eliminarPaquete);

module.exports = router;
