// src/routes/organizacion.routes.js
const express = require('express');
const router = express.Router();
const organizacionController = require('../controllers/organizacion.controller');

router.get('/', organizacionController.listarOrganizaciones);
router.get('/:id', organizacionController.obtenerOrganizacion);
router.post('/', organizacionController.crearOrganizacion);
router.put('/:id', organizacionController.actualizarOrganizacion);
router.delete('/:id', organizacionController.eliminarOrganizacion);

module.exports = router;
