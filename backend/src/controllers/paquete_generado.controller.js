// src/controllers/paquete_generado.controller.js
const PaqueteGenerado = require('../models/paquete_generado.model');

const listarPaquetes = async (req, res) => {
  try {
    const { id_proyecto } = req.query;
    const paquetes = await PaqueteGenerado.obtenerTodos({ id_proyecto });
    return res.json(paquetes);
  } catch (err) {
    console.error('Error al obtener paquetes:', err);
    return res.status(500).json({ mensaje: 'Error al obtener paquetes' });
  }
};

const obtenerPaquete = async (req, res) => {
  try {
    const { id } = req.params;
    const paquete = await PaqueteGenerado.obtenerPorId(id);
    if (!paquete) {
      return res.status(404).json({ mensaje: 'Paquete no encontrado' });
    }
    return res.json(paquete);
  } catch (err) {
    console.error('Error al obtener paquete:', err);
    return res.status(500).json({ mensaje: 'Error al obtener paquete' });
  }
};

const crearPaquete = async (req, res) => {
  try {
    const { id_proyecto, ruta_zip, version_scorm, lms_destino } = req.body;

    if (!id_proyecto || !ruta_zip || !version_scorm) {
      return res.status(400).json({
        mensaje: 'id_proyecto, ruta_zip y version_scorm son obligatorios',
      });
    }

    const id_paquete = await PaqueteGenerado.crear({
      id_proyecto,
      ruta_zip,
      version_scorm,
      lms_destino,
    });

    return res.status(201).json({
      mensaje: 'Paquete creado correctamente',
      id_paquete,
    });
  } catch (err) {
    console.error('Error al crear paquete:', err);
    return res.status(500).json({ mensaje: 'Error al crear paquete' });
  }
};

const actualizarPaquete = async (req, res) => {
  try {
    const { id } = req.params;
    const { ruta_zip, version_scorm, lms_destino } = req.body;

    if (!ruta_zip || !version_scorm) {
      return res.status(400).json({
        mensaje: 'ruta_zip y version_scorm son obligatorios',
      });
    }

    const affected = await PaqueteGenerado.actualizar(id, {
      ruta_zip,
      version_scorm,
      lms_destino,
    });

    if (!affected) {
      return res.status(404).json({ mensaje: 'Paquete no encontrado' });
    }

    return res.json({ mensaje: 'Paquete actualizado correctamente' });
  } catch (err) {
    console.error('Error al actualizar paquete:', err);
    return res.status(500).json({ mensaje: 'Error al actualizar paquete' });
  }
};

const eliminarPaquete = async (req, res) => {
  try {
    const { id } = req.params;
    const affected = await PaqueteGenerado.eliminar(id);
    if (!affected) {
      return res.status(404).json({ mensaje: 'Paquete no encontrado' });
    }
    return res.json({ mensaje: 'Paquete eliminado correctamente' });
  } catch (err) {
    console.error('Error al eliminar paquete:', err);
    return res.status(500).json({ mensaje: 'Error al eliminar paquete' });
  }
};

module.exports = {
  listarPaquetes,
  obtenerPaquete,
  crearPaquete,
  actualizarPaquete,
  eliminarPaquete,
};
