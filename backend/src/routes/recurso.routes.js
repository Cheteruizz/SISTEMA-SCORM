// src/routes/recurso.routes.js
const express = require('express');
const router = express.Router();
const recursoController = require('../controllers/recurso.controller');

router.get('/', recursoController.listarRecursos);
router.get('/:id', recursoController.obtenerRecurso);
router.post('/', recursoController.crearRecurso);
router.put('/:id', recursoController.actualizarRecurso);
router.delete('/:id', recursoController.eliminarRecurso);

module.exports = router;
