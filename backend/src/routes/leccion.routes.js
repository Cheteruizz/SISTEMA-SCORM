// src/routes/leccion.routes.js
const express = require('express');
const router = express.Router();
const leccionController = require('../controllers/leccion.controller');

router.get('/', leccionController.listarLecciones);
router.get('/:id', leccionController.obtenerLeccion);
router.post('/', leccionController.crearLeccion);
router.put('/:id', leccionController.actualizarLeccion);
router.delete('/:id', leccionController.eliminarLeccion);

module.exports = router;
