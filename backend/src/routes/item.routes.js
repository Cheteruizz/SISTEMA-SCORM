// src/routes/item.routes.js
const express = require('express');
const router = express.Router();
const itemController = require('../controllers/item.controller');

router.get('/', itemController.listarItems);
router.get('/:id', itemController.obtenerItem);
router.post('/', itemController.crearItem);
router.put('/:id', itemController.actualizarItem);
router.delete('/:id', itemController.eliminarItem);

module.exports = router;
