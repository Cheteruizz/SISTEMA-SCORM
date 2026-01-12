// src/controllers/manifest.controller.js
const Manifest = require('../models/manifest.model');

const listarManifests = async (req, res) => {
  try {
    const { id_proyecto } = req.query;
    const manifests = await Manifest.obtenerTodos({ id_proyecto });
    return res.json(manifests);
  } catch (err) {
    console.error('Error al obtener manifests:', err);
    return res.status(500).json({ mensaje: 'Error al obtener manifests' });
  }
};

const obtenerManifest = async (req, res) => {
  try {
    const { id } = req.params;
    const manifest = await Manifest.obtenerPorId(id);
    if (!manifest) {
      return res.status(404).json({ mensaje: 'Manifest no encontrado' });
    }
    return res.json(manifest);
  } catch (err) {
    console.error('Error al obtener manifest:', err);
    return res.status(500).json({ mensaje: 'Error al obtener manifest' });
  }
};

const crearManifest = async (req, res) => {
  try {
    const { id_proyecto, identificador, version, xmlns, schema_def, schema_version } =
      req.body;

    if (!id_proyecto || !identificador) {
      return res.status(400).json({
        mensaje: 'id_proyecto e identificador son obligatorios',
      });
    }

    const id_manifest = await Manifest.crear({
      id_proyecto,
      identificador,
      version,
      xmlns,
      schema_def,
      schema_version,
    });

    return res.status(201).json({
      mensaje: 'Manifest creado correctamente',
      id_manifest,
    });
  } catch (err) {
    console.error('Error al crear manifest:', err);
    return res.status(500).json({ mensaje: 'Error al crear manifest' });
  }
};

const actualizarManifest = async (req, res) => {
  try {
    const { id } = req.params;
    const { identificador, version, xmlns, schema_def, schema_version } = req.body;

    if (!identificador) {
      return res.status(400).json({
        mensaje: 'identificador es obligatorio',
      });
    }

    const affected = await Manifest.actualizar(id, {
      identificador,
      version,
      xmlns,
      schema_def,
      schema_version,
    });

    if (!affected) {
      return res.status(404).json({ mensaje: 'Manifest no encontrado' });
    }

    return res.json({ mensaje: 'Manifest actualizado correctamente' });
  } catch (err) {
    console.error('Error al actualizar manifest:', err);
    return res.status(500).json({ mensaje: 'Error al actualizar manifest' });
  }
};

const eliminarManifest = async (req, res) => {
  try {
    const { id } = req.params;
    const affected = await Manifest.eliminar(id);
    if (!affected) {
      return res.status(404).json({ mensaje: 'Manifest no encontrado' });
    }
    return res.json({ mensaje: 'Manifest eliminado correctamente' });
  } catch (err) {
    console.error('Error al eliminar manifest:', err);
    return res.status(500).json({ mensaje: 'Error al eliminar manifest' });
  }
};

module.exports = {
  listarManifests,
  obtenerManifest,
  crearManifest,
  actualizarManifest,
  eliminarManifest,
};
