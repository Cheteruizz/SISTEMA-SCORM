// src/controllers/archivo.controller.js
const Archivo = require('../models/archivo.model');

const MAX_ARCHIVOS_PROYECTO = 500;
const MAX_TOTAL_BYTES = 200 * 1024 * 1024;

const subirArchivo = async (req, res) => {
  try {
    const { id_proyecto, id_leccion } = req.body;

    if (!req.file) {
      return res.status(400).json({ mensaje: 'Archivo no enviado' });
    }

    if (!id_proyecto) {
      return res.status(400).json({ mensaje: 'id_proyecto es obligatorio' });
    }

    const totales = await Archivo.obtenerTotalesPorProyecto(id_proyecto);
    const totalArchivos = Number(totales.total_archivos || 0) + 1;
    const totalBytes = Number(totales.total_bytes || 0) + Number(req.file.size || 0);

    if (totalArchivos > MAX_ARCHIVOS_PROYECTO) {
      await require('fs').promises.unlink(req.file.path).catch(() => {});
      return res.status(400).json({ mensaje: 'Limite de archivos por proyecto alcanzado' });
    }

    if (totalBytes > MAX_TOTAL_BYTES) {
      await require('fs').promises.unlink(req.file.path).catch(() => {});
      return res.status(400).json({ mensaje: 'Limite total de almacenamiento excedido' });
    }

    const id_archivo = await Archivo.crear({
      id_proyecto,
      id_leccion,
      nombre_original: req.file.originalname,
      nombre_fisico: req.file.filename,
      tipo_mime: req.file.mimetype,
      tamano_bytes: req.file.size,
      ruta: req.file.filename,
    });

    return res.status(201).json({
      mensaje: 'Archivo subido correctamente',
      id_archivo,
      nombre_fisico: req.file.filename,
    });
  } catch (err) {
    console.error('Error al subir archivo:', err);
    return res.status(500).json({ mensaje: 'Error al subir archivo' });
  }
};

const listarArchivos = async (req, res) => {
  try {
    const { id_proyecto, id_leccion } = req.query;
    const archivos = await Archivo.obtenerTodos({ id_proyecto, id_leccion });
    return res.json(archivos);
  } catch (err) {
    console.error('Error al obtener archivos:', err);
    return res.status(500).json({ mensaje: 'Error al obtener archivos' });
  }
};

const obtenerArchivo = async (req, res) => {
  try {
    const { id } = req.params;
    const archivo = await Archivo.obtenerPorId(id);
    if (!archivo) {
      return res.status(404).json({ mensaje: 'Archivo no encontrado' });
    }
    return res.json(archivo);
  } catch (err) {
    console.error('Error al obtener archivo:', err);
    return res.status(500).json({ mensaje: 'Error al obtener archivo' });
  }
};

const crearArchivo = async (req, res) => {
  try {
    const {
      id_proyecto,
      id_leccion,
      nombre_original,
      nombre_fisico,
      tipo_mime,
      tamano_bytes,
      ruta,
    } = req.body;

    if (!id_proyecto || !nombre_original || !nombre_fisico || !tipo_mime || !ruta) {
      return res.status(400).json({
        mensaje: 'id_proyecto, nombre_original, nombre_fisico, tipo_mime y ruta son obligatorios',
      });
    }

    const id_archivo = await Archivo.crear({
      id_proyecto,
      id_leccion,
      nombre_original,
      nombre_fisico,
      tipo_mime,
      tamano_bytes,
      ruta,
    });

    return res.status(201).json({
      mensaje: 'Archivo creado correctamente',
      id_archivo,
    });
  } catch (err) {
    console.error('Error al crear archivo:', err);
    return res.status(500).json({ mensaje: 'Error al crear archivo' });
  }
};

const actualizarArchivo = async (req, res) => {
  try {
    const { id } = req.params;
    const { id_leccion, nombre_original, nombre_fisico, tipo_mime, tamano_bytes, ruta } =
      req.body;

    if (!nombre_original || !nombre_fisico || !tipo_mime || !ruta) {
      return res.status(400).json({
        mensaje: 'nombre_original, nombre_fisico, tipo_mime y ruta son obligatorios',
      });
    }

    const affected = await Archivo.actualizar(id, {
      id_leccion,
      nombre_original,
      nombre_fisico,
      tipo_mime,
      tamano_bytes,
      ruta,
    });

    if (!affected) {
      return res.status(404).json({ mensaje: 'Archivo no encontrado' });
    }

    return res.json({ mensaje: 'Archivo actualizado correctamente' });
  } catch (err) {
    console.error('Error al actualizar archivo:', err);
    return res.status(500).json({ mensaje: 'Error al actualizar archivo' });
  }
};

const eliminarArchivo = async (req, res) => {
  try {
    const { id } = req.params;
    const affected = await Archivo.eliminar(id);
    if (!affected) {
      return res.status(404).json({ mensaje: 'Archivo no encontrado' });
    }
    return res.json({ mensaje: 'Archivo eliminado correctamente' });
  } catch (err) {
    console.error('Error al eliminar archivo:', err);
    return res.status(500).json({ mensaje: 'Error al eliminar archivo' });
  }
};

module.exports = {
  subirArchivo,
  listarArchivos,
  obtenerArchivo,
  crearArchivo,
  actualizarArchivo,
  eliminarArchivo,
};
