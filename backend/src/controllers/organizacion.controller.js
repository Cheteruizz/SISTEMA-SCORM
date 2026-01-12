// src/controllers/organizacion.controller.js
const Organizacion = require('../models/organizacion.model');

const listarOrganizaciones = async (req, res) => {
  try {
    const { id_manifest } = req.query;
    const organizaciones = await Organizacion.obtenerTodos({ id_manifest });
    return res.json(organizaciones);
  } catch (err) {
    console.error('Error al obtener organizaciones:', err);
    return res.status(500).json({ mensaje: 'Error al obtener organizaciones' });
  }
};

const obtenerOrganizacion = async (req, res) => {
  try {
    const { id } = req.params;
    const organizacion = await Organizacion.obtenerPorId(id);
    if (!organizacion) {
      return res.status(404).json({ mensaje: 'Organizacion no encontrada' });
    }
    return res.json(organizacion);
  } catch (err) {
    console.error('Error al obtener organizacion:', err);
    return res.status(500).json({ mensaje: 'Error al obtener organizacion' });
  }
};

const crearOrganizacion = async (req, res) => {
  try {
    const { id_manifest, identificador, titulo, es_principal } = req.body;

    if (!id_manifest || !identificador || !titulo) {
      return res.status(400).json({
        mensaje: 'id_manifest, identificador y titulo son obligatorios',
      });
    }

    const id_organizacion = await Organizacion.crear({
      id_manifest,
      identificador,
      titulo,
      es_principal,
    });

    return res.status(201).json({
      mensaje: 'Organizacion creada correctamente',
      id_organizacion,
    });
  } catch (err) {
    console.error('Error al crear organizacion:', err);
    return res.status(500).json({ mensaje: 'Error al crear organizacion' });
  }
};

const actualizarOrganizacion = async (req, res) => {
  try {
    const { id } = req.params;
    const { identificador, titulo, es_principal } = req.body;

    if (!identificador || !titulo) {
      return res.status(400).json({
        mensaje: 'identificador y titulo son obligatorios',
      });
    }

    const affected = await Organizacion.actualizar(id, {
      identificador,
      titulo,
      es_principal,
    });

    if (!affected) {
      return res.status(404).json({ mensaje: 'Organizacion no encontrada' });
    }

    return res.json({ mensaje: 'Organizacion actualizada correctamente' });
  } catch (err) {
    console.error('Error al actualizar organizacion:', err);
    return res.status(500).json({ mensaje: 'Error al actualizar organizacion' });
  }
};

const eliminarOrganizacion = async (req, res) => {
  try {
    const { id } = req.params;
    const affected = await Organizacion.eliminar(id);
    if (!affected) {
      return res.status(404).json({ mensaje: 'Organizacion no encontrada' });
    }
    return res.json({ mensaje: 'Organizacion eliminada correctamente' });
  } catch (err) {
    console.error('Error al eliminar organizacion:', err);
    return res.status(500).json({ mensaje: 'Error al eliminar organizacion' });
  }
};

module.exports = {
  listarOrganizaciones,
  obtenerOrganizacion,
  crearOrganizacion,
  actualizarOrganizacion,
  eliminarOrganizacion,
};
