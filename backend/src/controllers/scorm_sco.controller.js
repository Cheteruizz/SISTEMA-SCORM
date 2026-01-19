// src/controllers/scorm_sco.controller.js
const ScormSco = require('../models/scorm_sco.model');
const ScormScoArchivo = require('../models/scorm_sco_archivo.model');

const listarScos = async (req, res) => {
  try {
    const { id_proyecto } = req.query;
    const scos = await ScormSco.obtenerTodos({ id_proyecto });
    return res.json(scos);
  } catch (err) {
    console.error('Error al listar SCOs:', err);
    return res.status(500).json({ mensaje: 'Error al listar SCOs' });
  }
};

const obtenerSco = async (req, res) => {
  try {
    const { id } = req.params;
    const sco = await ScormSco.obtenerPorId(id);
    if (!sco) {
      return res.status(404).json({ mensaje: 'SCO no encontrado' });
    }
    const archivos = await ScormScoArchivo.obtenerPorSco(id);
    return res.json({ ...sco, archivos });
  } catch (err) {
    console.error('Error al obtener SCO:', err);
    return res.status(500).json({ mensaje: 'Error al obtener SCO' });
  }
};

const crearSco = async (req, res) => {
  try {
    const { id_proyecto, titulo, archivo_entrada } = req.body;
    if (!id_proyecto || !titulo || !archivo_entrada) {
      return res.status(400).json({
        mensaje: 'id_proyecto, titulo y archivo_entrada son obligatorios',
      });
    }

    const id_sco = await ScormSco.crear(req.body);
    return res.status(201).json({ mensaje: 'SCO creado', id_sco });
  } catch (err) {
    console.error('Error al crear SCO:', err);
    return res.status(500).json({ mensaje: 'Error al crear SCO' });
  }
};

const actualizarSco = async (req, res) => {
  try {
    const { id } = req.params;
    const { titulo, archivo_entrada } = req.body;
    if (!titulo || !archivo_entrada) {
      return res.status(400).json({
        mensaje: 'titulo y archivo_entrada son obligatorios',
      });
    }

    const affected = await ScormSco.actualizar(id, req.body);
    if (!affected) {
      return res.status(404).json({ mensaje: 'SCO no encontrado' });
    }
    return res.json({ mensaje: 'SCO actualizado' });
  } catch (err) {
    console.error('Error al actualizar SCO:', err);
    return res.status(500).json({ mensaje: 'Error al actualizar SCO' });
  }
};

const eliminarSco = async (req, res) => {
  try {
    const { id } = req.params;
    await ScormScoArchivo.eliminarPorSco(id);
    const affected = await ScormSco.eliminar(id);
    if (!affected) {
      return res.status(404).json({ mensaje: 'SCO no encontrado' });
    }
    return res.json({ mensaje: 'SCO eliminado' });
  } catch (err) {
    console.error('Error al eliminar SCO:', err);
    return res.status(500).json({ mensaje: 'Error al eliminar SCO' });
  }
};

const agregarArchivo = async (req, res) => {
  try {
    const { id } = req.params;
    const { id_archivo, ruta_relativa, es_entrada } = req.body;
    if (!ruta_relativa) {
      return res.status(400).json({ mensaje: 'ruta_relativa es obligatoria' });
    }
    const id_sco_archivo = await ScormScoArchivo.crear({
      id_sco: id,
      id_archivo,
      ruta_relativa,
      es_entrada,
    });
    return res.status(201).json({ mensaje: 'Archivo agregado', id_sco_archivo });
  } catch (err) {
    console.error('Error al agregar archivo al SCO:', err);
    return res.status(500).json({ mensaje: 'Error al agregar archivo' });
  }
};

const eliminarArchivo = async (req, res) => {
  try {
    const { id_archivo } = req.params;
    const affected = await ScormScoArchivo.eliminar(id_archivo);
    if (!affected) {
      return res.status(404).json({ mensaje: 'Archivo SCO no encontrado' });
    }
    return res.json({ mensaje: 'Archivo SCO eliminado' });
  } catch (err) {
    console.error('Error al eliminar archivo SCO:', err);
    return res.status(500).json({ mensaje: 'Error al eliminar archivo' });
  }
};

module.exports = {
  listarScos,
  obtenerSco,
  crearSco,
  actualizarSco,
  eliminarSco,
  agregarArchivo,
  eliminarArchivo,
};
