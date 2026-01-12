// src/models/recurso.model.js
const db = require('../db');

const Recurso = {
  async obtenerTodos(filtros = {}) {
    const where = [];
    const params = [];

    if (filtros.id_manifest) {
      where.push('id_manifest = ?');
      params.push(filtros.id_manifest);
    }

    const sql =
      'SELECT * FROM recurso' + (where.length ? ` WHERE ${where.join(' AND ')}` : '');
    const [rows] = await db.query(sql, params);
    return rows;
  },

  async obtenerPorId(id_recurso) {
    const [rows] = await db.query('SELECT * FROM recurso WHERE id_recurso = ?', [
      id_recurso,
    ]);
    return rows[0] || null;
  },

  async crear({
    id_manifest,
    id_archivo,
    identificador,
    href,
    tipo_recurso,
    scorm_type,
    parametros,
  }) {
    const [result] = await db.query(
      `INSERT INTO recurso
        (id_manifest, id_archivo, identificador, href, tipo_recurso, scorm_type, parametros)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id_manifest,
        id_archivo,
        identificador,
        href,
        tipo_recurso,
        scorm_type || 'sco',
        parametros || null,
      ]
    );
    return result.insertId;
  },

  async actualizar(
    id_recurso,
    { id_archivo, identificador, href, tipo_recurso, scorm_type, parametros }
  ) {
    const [result] = await db.query(
      `UPDATE recurso
       SET id_archivo = ?, identificador = ?, href = ?, tipo_recurso = ?, scorm_type = ?, parametros = ?
       WHERE id_recurso = ?`,
      [
        id_archivo,
        identificador,
        href,
        tipo_recurso,
        scorm_type || 'sco',
        parametros || null,
        id_recurso,
      ]
    );
    return result.affectedRows;
  },

  async eliminar(id_recurso) {
    const [result] = await db.query('DELETE FROM recurso WHERE id_recurso = ?', [
      id_recurso,
    ]);
    return result.affectedRows;
  },
};

module.exports = Recurso;
