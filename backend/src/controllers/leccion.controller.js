// src/controllers/leccion.controller.js
const Leccion = require('../models/leccion.model');

const listarLecciones = async (req, res) => {
  try {
    const { id_modulo } = req.query;
    const lecciones = await Leccion.obtenerTodos({ id_modulo });
    return res.json(lecciones);
  } catch (err) {
    console.error('Error al obtener lecciones:', err);
    return res.status(500).json({ mensaje: 'Error al obtener lecciones' });
  }
};

const obtenerLeccion = async (req, res) => {
  try {
    const { id } = req.params;
    const leccion = await Leccion.obtenerPorId(id);
    if (!leccion) {
      return res.status(404).json({ mensaje: 'Leccion no encontrada' });
    }
    return res.json(leccion);
  } catch (err) {
    console.error('Error al obtener leccion:', err);
    return res.status(500).json({ mensaje: 'Error al obtener leccion' });
  }
};

const crearLeccion = async (req, res) => {
  try {
    const {
      id_modulo,
      nombre_leccion,
      tipo_leccion,
      descripcion,
      duracion_minutos,
      codigo_leccion,
    } = req.body;

    if (!id_modulo || !nombre_leccion || !tipo_leccion) {
      return res.status(400).json({
        mensaje: 'id_modulo, nombre_leccion y tipo_leccion son obligatorios',
      });
    }

    const id_leccion = await Leccion.crear({
      id_modulo,
      nombre_leccion,
      tipo_leccion,
      descripcion,
      duracion_minutos,
      codigo_leccion,
    });

    return res.status(201).json({
      mensaje: 'Leccion creada correctamente',
      id_leccion,
    });
  } catch (err) {
    console.error('Error al crear leccion:', err);
    return res.status(500).json({ mensaje: 'Error al crear leccion' });
  }
};

const actualizarLeccion = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre_leccion, tipo_leccion, descripcion, duracion_minutos, codigo_leccion } =
      req.body;

    if (!nombre_leccion || !tipo_leccion) {
      return res.status(400).json({
        mensaje: 'nombre_leccion y tipo_leccion son obligatorios',
      });
    }

    const affected = await Leccion.actualizar(id, {
      nombre_leccion,
      tipo_leccion,
      descripcion,
      duracion_minutos,
      codigo_leccion,
    });

    if (!affected) {
      return res.status(404).json({ mensaje: 'Leccion no encontrada' });
    }

    return res.json({ mensaje: 'Leccion actualizada correctamente' });
  } catch (err) {
    console.error('Error al actualizar leccion:', err);
    return res.status(500).json({ mensaje: 'Error al actualizar leccion' });
  }
};

const eliminarLeccion = async (req, res) => {
  try {
    const { id } = req.params;
    const affected = await Leccion.eliminar(id);
    if (!affected) {
      return res.status(404).json({ mensaje: 'Leccion no encontrada' });
    }
    return res.json({ mensaje: 'Leccion eliminada correctamente' });
  } catch (err) {
    console.error('Error al eliminar leccion:', err);
    return res.status(500).json({ mensaje: 'Error al eliminar leccion' });
  }
};

module.exports = {
  listarLecciones,
  obtenerLeccion,
  crearLeccion,
  actualizarLeccion,
  eliminarLeccion,
};
