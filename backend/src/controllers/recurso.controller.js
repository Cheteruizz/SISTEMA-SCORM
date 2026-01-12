// src/controllers/recurso.controller.js
const Recurso = require('../models/recurso.model');

const listarRecursos = async (req, res) => {
  try {
    const { id_manifest } = req.query;
    const recursos = await Recurso.obtenerTodos({ id_manifest });
    return res.json(recursos);
  } catch (err) {
    console.error('Error al obtener recursos:', err);
    return res.status(500).json({ mensaje: 'Error al obtener recursos' });
  }
};

const obtenerRecurso = async (req, res) => {
  try {
    const { id } = req.params;
    const recurso = await Recurso.obtenerPorId(id);
    if (!recurso) {
      return res.status(404).json({ mensaje: 'Recurso no encontrado' });
    }
    return res.json(recurso);
  } catch (err) {
    console.error('Error al obtener recurso:', err);
    return res.status(500).json({ mensaje: 'Error al obtener recurso' });
  }
};

const crearRecurso = async (req, res) => {
  try {
    const { id_manifest, id_archivo, identificador, href, tipo_recurso, scorm_type, parametros } =
      req.body;

    if (!id_manifest || !id_archivo || !identificador || !href || !tipo_recurso) {
      return res.status(400).json({
        mensaje:
          'id_manifest, id_archivo, identificador, href y tipo_recurso son obligatorios',
      });
    }

    const id_recurso = await Recurso.crear({
      id_manifest,
      id_archivo,
      identificador,
      href,
      tipo_recurso,
      scorm_type,
      parametros,
    });

    return res.status(201).json({
      mensaje: 'Recurso creado correctamente',
      id_recurso,
    });
  } catch (err) {
    console.error('Error al crear recurso:', err);
    return res.status(500).json({ mensaje: 'Error al crear recurso' });
  }
};

const actualizarRecurso = async (req, res) => {
  try {
    const { id } = req.params;
    const { id_archivo, identificador, href, tipo_recurso, scorm_type, parametros } =
      req.body;

    if (!id_archivo || !identificador || !href || !tipo_recurso) {
      return res.status(400).json({
        mensaje: 'id_archivo, identificador, href y tipo_recurso son obligatorios',
      });
    }

    const affected = await Recurso.actualizar(id, {
      id_archivo,
      identificador,
      href,
      tipo_recurso,
      scorm_type,
      parametros,
    });

    if (!affected) {
      return res.status(404).json({ mensaje: 'Recurso no encontrado' });
    }

    return res.json({ mensaje: 'Recurso actualizado correctamente' });
  } catch (err) {
    console.error('Error al actualizar recurso:', err);
    return res.status(500).json({ mensaje: 'Error al actualizar recurso' });
  }
};

const eliminarRecurso = async (req, res) => {
  try {
    const { id } = req.params;
    const affected = await Recurso.eliminar(id);
    if (!affected) {
      return res.status(404).json({ mensaje: 'Recurso no encontrado' });
    }
    return res.json({ mensaje: 'Recurso eliminado correctamente' });
  } catch (err) {
    console.error('Error al eliminar recurso:', err);
    return res.status(500).json({ mensaje: 'Error al eliminar recurso' });
  }
};

module.exports = {
  listarRecursos,
  obtenerRecurso,
  crearRecurso,
  actualizarRecurso,
  eliminarRecurso,
};
