// src/controllers/proyecto.controller.js
const Proyecto = require('../models/proyecto.model');

// GET /api/proyectos  → lista todos los proyectos
const listarProyectos = async (req, res) => {
  try {
    const proyectos = await Proyecto.obtenerTodos();
    return res.json(proyectos);
  } catch (err) {
    console.error('Error al obtener proyectos:', err);
    return res.status(500).json({ mensaje: 'Error al obtener proyectos' });
  }
};

// POST /api/proyectos  → crea un proyecto nuevo
const crearProyecto = async (req, res) => {
  try {
    const { id_usuario, titulo, descripcion, version_scorm, estado } = req.body;

    // Validación mínima
    if (!id_usuario || !titulo || !version_scorm || !estado) {
      return res.status(400).json({
        mensaje:
          'id_usuario, titulo, version_scorm y estado son obligatorios',
      });
    }

    const id_proyecto = await Proyecto.crear({
      id_usuario,
      titulo,
      descripcion: descripcion || null,
      version_scorm,
      estado,
    });

    return res.status(201).json({
      mensaje: 'Proyecto creado correctamente',
      id_proyecto,
    });
  } catch (err) {
    console.error('Error al crear proyecto:', err);
    return res.status(500).json({ mensaje: 'Error al crear proyecto' });
  }
};

module.exports = {
  listarProyectos,
  crearProyecto,
};
