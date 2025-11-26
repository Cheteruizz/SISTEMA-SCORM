const express = require('express');
const router = express.Router();
const controller = require('../controllers/usuario.controller');

// Rutas del usuario
router.get('/', controller.obtenerUsuarios);
router.post('/', controller.crearUsuario);

module.exports = router;
