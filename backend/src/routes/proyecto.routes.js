// src/routes/proyecto.routes.js
const express = require('express');
const router = express.Router();
const proyectoController = require('../controllers/proyecto.controller');

router.get('/ping', (req, res) => {
  res.json({ mensaje: 'Rutas de proyectos funcionando correctamente' });
});

router.get('/', proyectoController.listarProyectos);
router.get('/:id', proyectoController.obtenerProyecto);
router.post('/', proyectoController.crearProyecto);
router.put('/:id', proyectoController.actualizarProyecto);
router.delete('/:id', proyectoController.eliminarProyecto);

module.exports = router;
