// src/models/manifest.model.js
const db = require('../db');

const Manifest = {
  async obtenerTodos(filtros = {}) {
    const where = [];
    const params = [];

    if (filtros.id_proyecto) {
      where.push('id_proyecto = ?');
      params.push(filtros.id_proyecto);
    }

    const sql =
      'SELECT * FROM manifest' + (where.length ? ` WHERE ${where.join(' AND ')}` : '');
    const [rows] = await db.query(sql, params);
    return rows;
  },

  async obtenerPorId(id_manifest) {
    const [rows] = await db.query('SELECT * FROM manifest WHERE id_manifest = ?', [
      id_manifest,
    ]);
    return rows[0] || null;
  },

  async crear({ id_proyecto, identificador, version, xmlns, schema_def, schema_version }) {
    const [result] = await db.query(
      `INSERT INTO manifest
        (id_proyecto, identificador, version, xmlns, schema_def, schema_version, fecha_generacion)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [
        id_proyecto,
        identificador,
        version || null,
        xmlns || null,
        schema_def || null,
        schema_version || null,
      ]
    );
    return result.insertId;
  },

  async actualizar(
    id_manifest,
    { identificador, version, xmlns, schema_def, schema_version }
  ) {
    const [result] = await db.query(
      `UPDATE manifest
       SET identificador = ?, version = ?, xmlns = ?, schema_def = ?, schema_version = ?
       WHERE id_manifest = ?`,
      [
        identificador,
        version || null,
        xmlns || null,
        schema_def || null,
        schema_version || null,
        id_manifest,
      ]
    );
    return result.affectedRows;
  },

  async eliminar(id_manifest) {
    const [result] = await db.query('DELETE FROM manifest WHERE id_manifest = ?', [
      id_manifest,
    ]);
    return result.affectedRows;
  },
};

module.exports = Manifest;
