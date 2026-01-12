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

  async crear({ id_usuario, titulo, descripcion, version_scorm, estado }) {
    const [result] = await db.query(
      `INSERT INTO proyecto_scorm
        (id_usuario, titulo, descripcion, version_scorm, estado, fecha_creacion, ultima_modificacion)
       VALUES (?, ?, ?, ?, ?, NOW(), NULL)`,
      [id_usuario, titulo, descripcion, version_scorm, estado]
    );
    return result.insertId;
  },

  async actualizar(id_proyecto, { titulo, descripcion, version_scorm, estado }) {
    const [result] = await db.query(
      `UPDATE proyecto_scorm
       SET titulo = ?, descripcion = ?, version_scorm = ?, estado = ?, ultima_modificacion = NOW()
       WHERE id_proyecto = ?`,
      [titulo, descripcion, version_scorm, estado, id_proyecto]
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
