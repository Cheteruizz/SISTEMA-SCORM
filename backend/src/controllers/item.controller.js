// src/controllers/item.controller.js
const Item = require('../models/item.model');

const listarItems = async (req, res) => {
  try {
    const { id_organizacion, id_padre } = req.query;
    const items = await Item.obtenerTodos({ id_organizacion, id_padre });
    return res.json(items);
  } catch (err) {
    console.error('Error al obtener items:', err);
    return res.status(500).json({ mensaje: 'Error al obtener items' });
  }
};

const obtenerItem = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await Item.obtenerPorId(id);
    if (!item) {
      return res.status(404).json({ mensaje: 'Item no encontrado' });
    }
    return res.json(item);
  } catch (err) {
    console.error('Error al obtener item:', err);
    return res.status(500).json({ mensaje: 'Error al obtener item' });
  }
};

const crearItem = async (req, res) => {
  try {
    const {
      id_organizacion,
      id_padre,
      identificador,
      titulo,
      tipo_item,
      orden,
      es_lanzable,
      id_modulo,
      id_leccion,
      id_recurso,
    } = req.body;

    if (!id_organizacion || !identificador || !titulo) {
      return res.status(400).json({
        mensaje: 'id_organizacion, identificador y titulo son obligatorios',
      });
    }

    const id_item = await Item.crear({
      id_organizacion,
      id_padre,
      identificador,
      titulo,
      tipo_item,
      orden,
      es_lanzable,
      id_modulo,
      id_leccion,
      id_recurso,
    });

    return res.status(201).json({
      mensaje: 'Item creado correctamente',
      id_item,
    });
  } catch (err) {
    console.error('Error al crear item:', err);
    return res.status(500).json({ mensaje: 'Error al crear item' });
  }
};

const actualizarItem = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      id_padre,
      identificador,
      titulo,
      tipo_item,
      orden,
      es_lanzable,
      id_modulo,
      id_leccion,
      id_recurso,
    } = req.body;

    if (!identificador || !titulo) {
      return res.status(400).json({
        mensaje: 'identificador y titulo son obligatorios',
      });
    }

    const affected = await Item.actualizar(id, {
      id_padre,
      identificador,
      titulo,
      tipo_item,
      orden,
      es_lanzable,
      id_modulo,
      id_leccion,
      id_recurso,
    });

    if (!affected) {
      return res.status(404).json({ mensaje: 'Item no encontrado' });
    }

    return res.json({ mensaje: 'Item actualizado correctamente' });
  } catch (err) {
    console.error('Error al actualizar item:', err);
    return res.status(500).json({ mensaje: 'Error al actualizar item' });
  }
};

const eliminarItem = async (req, res) => {
  try {
    const { id } = req.params;
    const affected = await Item.eliminar(id);
    if (!affected) {
      return res.status(404).json({ mensaje: 'Item no encontrado' });
    }
    return res.json({ mensaje: 'Item eliminado correctamente' });
  } catch (err) {
    console.error('Error al eliminar item:', err);
    return res.status(500).json({ mensaje: 'Error al eliminar item' });
  }
};

module.exports = {
  listarItems,
  obtenerItem,
  crearItem,
  actualizarItem,
  eliminarItem,
};
