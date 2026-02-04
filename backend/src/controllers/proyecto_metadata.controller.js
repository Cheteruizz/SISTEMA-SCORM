// src/controllers/proyecto_metadata.controller.js
const ProyectoMetadata = require('../models/proyecto_metadata.model');

const listarMetadata = async (req, res) => {
  try {
    const { id_proyecto } = req.query;
    const metadata = await ProyectoMetadata.obtenerTodos({ id_proyecto });
    return res.json(metadata);
  } catch (err) {
    console.error('Error al obtener metadata:', err);
    return res.status(500).json({ mensaje: 'Error al obtener metadata' });
  }
};

const obtenerMetadata = async (req, res) => {
  try {
    const { id } = req.params;
    const metadata = await ProyectoMetadata.obtenerPorId(id);
    if (!metadata) {
      return res.status(404).json({ mensaje: 'Metadata no encontrada' });
    }
    return res.json(metadata);
  } catch (err) {
    console.error('Error al obtener metadata:', err);
    return res.status(500).json({ mensaje: 'Error al obtener metadata' });
  }
};

const crearMetadata = async (req, res) => {
  try {
    const {
      id_proyecto,
      idioma,
      autor_principal,
      organizacion,
      entidad_publicadora,
      palabras_clave,
      nivel_dificultad,
      objetivo,
      descripcion_detallada,
      portada_ruta,
    } = req.body;

    if (!id_proyecto) {
      return res.status(400).json({
        mensaje: 'id_proyecto es obligatorio',
      });
    }

    const id_metadata = await ProyectoMetadata.crear({
      id_proyecto,
      idioma,
      autor_principal,
      organizacion,
      entidad_publicadora,
      palabras_clave,
      nivel_dificultad,
      objetivo,
      descripcion_detallada,
      portada_ruta,
    });

    return res.status(201).json({
      mensaje: 'Metadata creada correctamente',
      id_metadata,
    });
  } catch (err) {
    console.error('Error al crear metadata:', err);
    return res.status(500).json({ mensaje: 'Error al crear metadata' });
  }
};

const actualizarMetadata = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      idioma,
      autor_principal,
      organizacion,
      entidad_publicadora,
      palabras_clave,
      nivel_dificultad,
      objetivo,
      descripcion_detallada,
      portada_ruta,
    } = req.body;

    const affected = await ProyectoMetadata.actualizar(id, {
      idioma,
      autor_principal,
      organizacion,
      entidad_publicadora,
      palabras_clave,
      nivel_dificultad,
      objetivo,
      descripcion_detallada,
      portada_ruta,
    });

    if (!affected) {
      return res.status(404).json({ mensaje: 'Metadata no encontrada' });
    }

    return res.json({ mensaje: 'Metadata actualizada correctamente' });
  } catch (err) {
    console.error('Error al actualizar metadata:', err);
    return res.status(500).json({ mensaje: 'Error al actualizar metadata' });
  }
};

const eliminarMetadata = async (req, res) => {
  try {
    const { id } = req.params;
    const affected = await ProyectoMetadata.eliminar(id);
    if (!affected) {
      return res.status(404).json({ mensaje: 'Metadata no encontrada' });
    }
    return res.json({ mensaje: 'Metadata eliminada correctamente' });
  } catch (err) {
    console.error('Error al eliminar metadata:', err);
    return res.status(500).json({ mensaje: 'Error al eliminar metadata' });
  }
};

module.exports = {
  listarMetadata,
  obtenerMetadata,
  crearMetadata,
  actualizarMetadata,
  eliminarMetadata,
};
