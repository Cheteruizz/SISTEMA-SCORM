// src/controllers/modulo.controller.js
const Modulo = require('../models/modulo.model');

const listarModulos = async (req, res) => {
  try {
    const { id_proyecto } = req.query;
    const modulos = await Modulo.obtenerTodos({ id_proyecto });
    return res.json(modulos);
  } catch (err) {
    console.error('Error al obtener modulos:', err);
    return res.status(500).json({ mensaje: 'Error al obtener modulos' });
  }
};

const obtenerModulo = async (req, res) => {
  try {
    const { id } = req.params;
    const modulo = await Modulo.obtenerPorId(id);
    if (!modulo) {
      return res.status(404).json({ mensaje: 'Modulo no encontrado' });
    }
    return res.json(modulo);
  } catch (err) {
    console.error('Error al obtener modulo:', err);
    return res.status(500).json({ mensaje: 'Error al obtener modulo' });
  }
};

const crearModulo = async (req, res) => {
  try {
    const { id_proyecto, nombre_modulo, descripcion, duracion_minutos, codigo_modulo } =
      req.body;

    if (!id_proyecto || !nombre_modulo) {
      return res.status(400).json({
        mensaje: 'id_proyecto y nombre_modulo son obligatorios',
      });
    }

    const id_modulo = await Modulo.crear({
      id_proyecto,
      nombre_modulo,
      descripcion,
      duracion_minutos,
      codigo_modulo,
    });

    return res.status(201).json({
      mensaje: 'Modulo creado correctamente',
      id_modulo,
    });
  } catch (err) {
    console.error('Error al crear modulo:', err);
    return res.status(500).json({ mensaje: 'Error al crear modulo' });
  }
};

const actualizarModulo = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre_modulo, descripcion, duracion_minutos, codigo_modulo } = req.body;

    if (!nombre_modulo) {
      return res.status(400).json({
        mensaje: 'nombre_modulo es obligatorio',
      });
    }

    const affected = await Modulo.actualizar(id, {
      nombre_modulo,
      descripcion,
      duracion_minutos,
      codigo_modulo,
    });

    if (!affected) {
      return res.status(404).json({ mensaje: 'Modulo no encontrado' });
    }

    return res.json({ mensaje: 'Modulo actualizado correctamente' });
  } catch (err) {
    console.error('Error al actualizar modulo:', err);
    return res.status(500).json({ mensaje: 'Error al actualizar modulo' });
  }
};

const eliminarModulo = async (req, res) => {
  try {
    const { id } = req.params;
    const affected = await Modulo.eliminar(id);
    if (!affected) {
      return res.status(404).json({ mensaje: 'Modulo no encontrado' });
    }
    return res.json({ mensaje: 'Modulo eliminado correctamente' });
  } catch (err) {
    console.error('Error al eliminar modulo:', err);
    return res.status(500).json({ mensaje: 'Error al eliminar modulo' });
  }
};

module.exports = {
  listarModulos,
  obtenerModulo,
  crearModulo,
  actualizarModulo,
  eliminarModulo,
};
