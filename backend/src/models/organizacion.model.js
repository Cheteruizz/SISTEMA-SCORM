// src/models/organizacion.model.js
const db = require('../db');

const Organizacion = {
  async obtenerTodos(filtros = {}) {
    const where = [];
    const params = [];

    if (filtros.id_manifest) {
      where.push('id_manifest = ?');
      params.push(filtros.id_manifest);
    }

    const sql =
      'SELECT * FROM organizacion' + (where.length ? ` WHERE ${where.join(' AND ')}` : '');
    const [rows] = await db.query(sql, params);
    return rows;
  },

  async obtenerPorId(id_organizacion) {
    const [rows] = await db.query(
      'SELECT * FROM organizacion WHERE id_organizacion = ?',
      [id_organizacion]
    );
    return rows[0] || null;
  },

  async crear({ id_manifest, identificador, titulo, es_principal }) {
    const [result] = await db.query(
      `INSERT INTO organizacion
        (id_manifest, identificador, titulo, es_principal)
       VALUES (?, ?, ?, ?)`,
      [id_manifest, identificador, titulo, es_principal ? 1 : 0]
    );
    return result.insertId;
  },

  async actualizar(id_organizacion, { identificador, titulo, es_principal }) {
    const [result] = await db.query(
      `UPDATE organizacion
       SET identificador = ?, titulo = ?, es_principal = ?
       WHERE id_organizacion = ?`,
      [identificador, titulo, es_principal ? 1 : 0, id_organizacion]
    );
    return result.affectedRows;
  },

  async eliminar(id_organizacion) {
    const [result] = await db.query(
      'DELETE FROM organizacion WHERE id_organizacion = ?',
      [id_organizacion]
    );
    return result.affectedRows;
  },
};

module.exports = Organizacion;
