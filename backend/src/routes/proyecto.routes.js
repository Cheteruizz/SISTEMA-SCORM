// src/routes/proyecto.routes.js
const express = require('express');
const router = express.Router();
const proyectoController = require('../controllers/proyecto.controller');

// Ruta de prueba opcional
router.get('/ping', (req, res) => {
  res.json({ mensaje: 'Rutas de proyectos funcionando correctamente' });
});

// GET /api/proyectos  → lista proyectos
router.get('/', proyectoController.listarProyectos);

// POST /api/proyectos  → crea proyecto
router.post('/', proyectoController.crearProyecto);

module.exports = router;
