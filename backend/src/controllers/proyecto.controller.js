// src/controllers/proyecto.controller.js
const Proyecto = require('../models/proyecto.model');

const listarProyectos = async (req, res) => {
  try {
    const proyectos = await Proyecto.obtenerTodos();
    return res.json(proyectos);
  } catch (err) {
    console.error('Error al obtener proyectos:', err);
    return res.status(500).json({ mensaje: 'Error al obtener proyectos' });
  }
};

const obtenerProyecto = async (req, res) => {
  try {
    const { id } = req.params;
    const proyecto = await Proyecto.obtenerPorId(id);
    if (!proyecto) {
      return res.status(404).json({ mensaje: 'Proyecto no encontrado' });
    }
    return res.json(proyecto);
  } catch (err) {
    console.error('Error al obtener proyecto:', err);
    return res.status(500).json({ mensaje: 'Error al obtener proyecto' });
  }
};

const crearProyecto = async (req, res) => {
  try {
    const {
      id_usuario,
      titulo,
      descripcion,
      version_scorm,
      estado,
      tracking_preset_default,
      tracking_auto_default,
      tracking_min_seconds_default,
      tracking_media_ratio_default,
    } = req.body;

    if (!id_usuario || !titulo || !version_scorm || !estado) {
      return res.status(400).json({
        mensaje: 'id_usuario, titulo, version_scorm y estado son obligatorios',
      });
    }

    const id_proyecto = await Proyecto.crear({
      id_usuario,
      titulo,
      descripcion: descripcion || null,
      version_scorm,
      estado,
      tracking_preset_default,
      tracking_auto_default,
      tracking_min_seconds_default,
      tracking_media_ratio_default,
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

const actualizarProyecto = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      titulo,
      descripcion,
      version_scorm,
      estado,
      tracking_preset_default,
      tracking_auto_default,
      tracking_min_seconds_default,
      tracking_media_ratio_default,
    } = req.body;

    if (!titulo || !version_scorm || !estado) {
      return res.status(400).json({
        mensaje: 'titulo, version_scorm y estado son obligatorios',
      });
    }

    let trackingPresetValue = tracking_preset_default;
    let trackingAutoValue = tracking_auto_default;
    let trackingMinSecondsValue = tracking_min_seconds_default;
    let trackingMediaRatioValue = tracking_media_ratio_default;

    if (
      trackingPresetValue === undefined ||
      trackingAutoValue === undefined ||
      trackingMinSecondsValue === undefined ||
      trackingMediaRatioValue === undefined
    ) {
      const existing = await Proyecto.obtenerPorId(id);
      if (existing) {
        if (trackingPresetValue === undefined) trackingPresetValue = existing.tracking_preset_default;
        if (trackingAutoValue === undefined) trackingAutoValue = existing.tracking_auto_default;
        if (trackingMinSecondsValue === undefined) {
          trackingMinSecondsValue = existing.tracking_min_seconds_default;
        }
        if (trackingMediaRatioValue === undefined) {
          trackingMediaRatioValue = existing.tracking_media_ratio_default;
        }
      }
    }

    const affected = await Proyecto.actualizar(id, {
      titulo,
      descripcion: descripcion || null,
      version_scorm,
      estado,
      tracking_preset_default: trackingPresetValue,
      tracking_auto_default: trackingAutoValue,
      tracking_min_seconds_default: trackingMinSecondsValue,
      tracking_media_ratio_default: trackingMediaRatioValue,
    });

    if (!affected) {
      return res.status(404).json({ mensaje: 'Proyecto no encontrado' });
    }

    return res.json({ mensaje: 'Proyecto actualizado correctamente' });
  } catch (err) {
    console.error('Error al actualizar proyecto:', err);
    return res.status(500).json({ mensaje: 'Error al actualizar proyecto' });
  }
};

const eliminarProyecto = async (req, res) => {
  try {
    const { id } = req.params;
    const affected = await Proyecto.eliminar(id);
    if (!affected) {
      return res.status(404).json({ mensaje: 'Proyecto no encontrado' });
    }
    return res.json({ mensaje: 'Proyecto eliminado correctamente' });
  } catch (err) {
    console.error('Error al eliminar proyecto:', err);
    return res.status(500).json({ mensaje: 'Error al eliminar proyecto' });
  }
};

module.exports = {
  listarProyectos,
  obtenerProyecto,
  crearProyecto,
  actualizarProyecto,
  eliminarProyecto,
};
