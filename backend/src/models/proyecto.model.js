// src/models/proyecto.model.js
const db = require('../db');

const Proyecto = {
  async obtenerTodos() {
    const [rows] = await db.query('SELECT * FROM proyecto_scorm');
    return rows;
  },

  async obtenerPorId(id_proyecto) {
    const [rows] = await db.query(
      'SELECT * FROM proyecto_scorm WHERE id_proyecto = ?',
      [id_proyecto]
    );
    return rows[0] || null;
  },

  async crear({
    id_usuario,
    titulo,
    descripcion,
    version_scorm,
    estado,
    tracking_preset_default,
    tracking_auto_default,
    tracking_min_seconds_default,
    tracking_media_ratio_default,
  }) {
    const [result] = await db.query(
      `INSERT INTO proyecto_scorm
        (id_usuario, titulo, descripcion, version_scorm, tracking_preset_default, tracking_auto_default, tracking_min_seconds_default, tracking_media_ratio_default, estado, fecha_creacion, ultima_modificacion)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NULL)`,
      [
        id_usuario,
        titulo,
        descripcion,
        version_scorm,
        tracking_preset_default || 'auto',
        tracking_auto_default ? 1 : 0,
        tracking_min_seconds_default ?? 180,
        tracking_media_ratio_default ?? 0.85,
        estado,
      ]
    );
    return result.insertId;
  },

  async actualizar(
    id_proyecto,
    {
      titulo,
      descripcion,
      version_scorm,
      estado,
      tracking_preset_default,
      tracking_auto_default,
      tracking_min_seconds_default,
      tracking_media_ratio_default,
    }
  ) {
    const [result] = await db.query(
      `UPDATE proyecto_scorm
       SET titulo = ?, descripcion = ?, version_scorm = ?, tracking_preset_default = ?, tracking_auto_default = ?, tracking_min_seconds_default = ?, tracking_media_ratio_default = ?, estado = ?, ultima_modificacion = NOW()
       WHERE id_proyecto = ?`,
      [
        titulo,
        descripcion,
        version_scorm,
        tracking_preset_default || 'auto',
        tracking_auto_default ? 1 : 0,
        tracking_min_seconds_default ?? 180,
        tracking_media_ratio_default ?? 0.85,
        estado,
        id_proyecto,
      ]
    );
    return result.affectedRows;
  },

  async eliminar(id_proyecto) {
    const [result] = await db.query(
      'DELETE FROM proyecto_scorm WHERE id_proyecto = ?',
      [id_proyecto]
    );
    return result.affectedRows;
  },
};

module.exports = Proyecto;
