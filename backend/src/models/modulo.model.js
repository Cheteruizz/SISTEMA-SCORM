// src/models/modulo.model.js
const db = require('../db');

const Modulo = {
  async obtenerTodos(filtros = {}) {
    const where = [];
    const params = [];

    if (filtros.id_proyecto) {
      where.push('id_proyecto = ?');
      params.push(filtros.id_proyecto);
    }

    const sql =
      'SELECT * FROM modulo' + (where.length ? ` WHERE ${where.join(' AND ')}` : '');
    const [rows] = await db.query(sql, params);
    return rows;
  },

  async obtenerPorId(id_modulo) {
    const [rows] = await db.query('SELECT * FROM modulo WHERE id_modulo = ?', [
      id_modulo,
    ]);
    return rows[0] || null;
  },

  async crear({ id_proyecto, nombre_modulo, descripcion, duracion_minutos, codigo_modulo }) {
    const [result] = await db.query(
      `INSERT INTO modulo
        (id_proyecto, nombre_modulo, descripcion, duracion_minutos, codigo_modulo)
       VALUES (?, ?, ?, ?, ?)`,
      [id_proyecto, nombre_modulo, descripcion || null, duracion_minutos || null, codigo_modulo || null]
    );
    return result.insertId;
  },

  async actualizar(
    id_modulo,
    { nombre_modulo, descripcion, duracion_minutos, codigo_modulo }
  ) {
    const [result] = await db.query(
      `UPDATE modulo
       SET nombre_modulo = ?, descripcion = ?, duracion_minutos = ?, codigo_modulo = ?
       WHERE id_modulo = ?`,
      [nombre_modulo, descripcion || null, duracion_minutos || null, codigo_modulo || null, id_modulo]
    );
    return result.affectedRows;
  },

  async eliminar(id_modulo) {
    const [result] = await db.query('DELETE FROM modulo WHERE id_modulo = ?', [
      id_modulo,
    ]);
    return result.affectedRows;
  },
};

module.exports = Modulo;
