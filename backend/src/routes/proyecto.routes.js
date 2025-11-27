const express = require('express');
const router = express.Router();
const ProyectoController = require('../controllers/proyecto.controller');

router.get('/', ProyectoController.getAllProyectos);
router.get('/:id', ProyectoController.getProyectoById);
router.post('/', ProyectoController.createProyecto);
router.put('/:id', ProyectoController.updateProyecto);
router.delete('/:id', ProyectoController.deleteProyecto);

module.exports = router;

