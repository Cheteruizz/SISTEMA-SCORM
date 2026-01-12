// src/models/leccion.model.js
const db = require('../db');

const Leccion = {
  async obtenerTodos(filtros = {}) {
    const where = [];
    const params = [];

    if (filtros.id_modulo) {
      where.push('id_modulo = ?');
      params.push(filtros.id_modulo);
    }

    const sql =
      'SELECT * FROM leccion' + (where.length ? ` WHERE ${where.join(' AND ')}` : '');
    const [rows] = await db.query(sql, params);
    return rows;
  },

  async obtenerPorId(id_leccion) {
    const [rows] = await db.query('SELECT * FROM leccion WHERE id_leccion = ?', [
      id_leccion,
    ]);
    return rows[0] || null;
  },

  async crear({
    id_modulo,
    nombre_leccion,
    tipo_leccion,
    descripcion,
    duracion_minutos,
    codigo_leccion,
  }) {
    const [result] = await db.query(
      `INSERT INTO leccion
        (id_modulo, nombre_leccion, tipo_leccion, descripcion, duracion_minutos, codigo_leccion)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id_modulo,
        nombre_leccion,
        tipo_leccion,
        descripcion || null,
        duracion_minutos || null,
        codigo_leccion || null,
      ]
    );
    return result.insertId;
  },

  async actualizar(
    id_leccion,
    { nombre_leccion, tipo_leccion, descripcion, duracion_minutos, codigo_leccion }
  ) {
    const [result] = await db.query(
      `UPDATE leccion
       SET nombre_leccion = ?, tipo_leccion = ?, descripcion = ?, duracion_minutos = ?, codigo_leccion = ?
       WHERE id_leccion = ?`,
      [
        nombre_leccion,
        tipo_leccion,
        descripcion || null,
        duracion_minutos || null,
        codigo_leccion || null,
        id_leccion,
      ]
    );
    return result.affectedRows;
  },

  async eliminar(id_leccion) {
    const [result] = await db.query('DELETE FROM leccion WHERE id_leccion = ?', [
      id_leccion,
    ]);
    return result.affectedRows;
  },
};

module.exports = Leccion;
