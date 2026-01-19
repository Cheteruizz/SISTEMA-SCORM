// src/routes/scorm_sco.routes.js
const express = require('express');
const router = express.Router();
const scoController = require('../controllers/scorm_sco.controller');

router.get('/', scoController.listarScos);
router.get('/:id', scoController.obtenerSco);
router.post('/', scoController.crearSco);
router.put('/:id', scoController.actualizarSco);
router.delete('/:id', scoController.eliminarSco);

router.post('/:id/archivos', scoController.agregarArchivo);
router.delete('/archivos/:id_archivo', scoController.eliminarArchivo);

module.exports = router;
