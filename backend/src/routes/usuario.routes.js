const express = require('express');
const router = express.Router();
const UsuarioController = require('../controllers/usuario.controller');

// Registrar usuario
router.post('/', UsuarioController.registrar);

// Login de usuario
router.post('/login', UsuarioController.login);

module.exports = router;
