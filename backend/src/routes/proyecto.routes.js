const express = require('express');
const router = express.Router();
const controller = require('../controllers/proyecto.controller');

// GET todos
router.get('/', controller.obtenerProyectos);

// GET uno por id
router.get('/:id', controller.obtenerProyectoPorId);

// POST crear
router.post('/', controller.crearProyecto);

// PUT actualizar
router.put('/:id', controller.actualizarProyecto);

// DELETE eliminar
router.delete('/:id', controller.eliminarProyecto);

module.exports = router;
