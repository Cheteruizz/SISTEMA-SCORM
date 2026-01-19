// src/routes/scorm_runtime.routes.js
const express = require('express');
const router = express.Router();
const runtimeController = require('../controllers/scorm_runtime.controller');

router.post('/sesion', runtimeController.crearSesion);
router.get('/sesion/:id', runtimeController.obtenerSesion);
router.patch('/sesion/:id', runtimeController.actualizarSesion);

router.get('/cmi/:id_sesion', runtimeController.obtenerCmi);
router.post('/cmi/:id_sesion', runtimeController.guardarCmi);

router.post('/interaccion/:id_sesion', runtimeController.agregarInteraccion);
router.post('/objetivo/:id_sesion', runtimeController.agregarObjetivo);
router.post('/comentario/:id_sesion', runtimeController.agregarComentario);

router.post('/:id_sesion/commit', runtimeController.commitSesion);
router.post('/:id_sesion/finish', runtimeController.finalizarSesion);

module.exports = router;
