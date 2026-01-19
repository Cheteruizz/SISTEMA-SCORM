// src/models/scorm_sco.model.js
const db = require('../db');

const ScormSco = {
  async obtenerTodos(filtros = {}) {
    const where = [];
    const params = [];

    if (filtros.id_proyecto) {
      where.push('id_proyecto = ?');
      params.push(filtros.id_proyecto);
    }

    const sql =
      'SELECT * FROM scorm_sco' + (where.length ? ` WHERE ${where.join(' AND ')}` : '');
    const [rows] = await db.query(sql, params);
    return rows;
  },

  async obtenerPorId(id_sco) {
    const [rows] = await db.query('SELECT * FROM scorm_sco WHERE id_sco = ?', [
      id_sco,
    ]);
    return rows[0] || null;
  },

  async crear({ id_proyecto, titulo, descripcion, archivo_entrada, ancho, alto }) {
    const [result] = await db.query(
      `INSERT INTO scorm_sco
        (id_proyecto, titulo, descripcion, archivo_entrada, ancho, alto)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id_proyecto,
        titulo,
        descripcion || null,
        archivo_entrada,
        ancho || null,
        alto || null,
      ]
    );
    return result.insertId;
  },

  async actualizar(id_sco, { titulo, descripcion, archivo_entrada, ancho, alto }) {
    const [result] = await db.query(
      `UPDATE scorm_sco
       SET titulo = ?, descripcion = ?, archivo_entrada = ?, ancho = ?, alto = ?
       WHERE id_sco = ?`,
      [
        titulo,
        descripcion || null,
        archivo_entrada,
        ancho || null,
        alto || null,
        id_sco,
      ]
    );
    return result.affectedRows;
  },

  async eliminar(id_sco) {
    const [result] = await db.query('DELETE FROM scorm_sco WHERE id_sco = ?', [
      id_sco,
    ]);
    return result.affectedRows;
  },
};

module.exports = ScormSco;
