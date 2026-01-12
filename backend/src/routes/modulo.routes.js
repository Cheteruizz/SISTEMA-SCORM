// src/routes/modulo.routes.js
const express = require('express');
const router = express.Router();
const moduloController = require('../controllers/modulo.controller');

router.get('/', moduloController.listarModulos);
router.get('/:id', moduloController.obtenerModulo);
router.post('/', moduloController.crearModulo);
router.put('/:id', moduloController.actualizarModulo);
router.delete('/:id', moduloController.eliminarModulo);

module.exports = router;
