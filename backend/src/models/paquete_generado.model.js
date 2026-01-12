// src/models/paquete_generado.model.js
const db = require('../db');

const PaqueteGenerado = {
  async obtenerTodos(filtros = {}) {
    const where = [];
    const params = [];

    if (filtros.id_proyecto) {
      where.push('id_proyecto = ?');
      params.push(filtros.id_proyecto);
    }

    const sql =
      'SELECT * FROM paquete_generado' +
      (where.length ? ` WHERE ${where.join(' AND ')}` : '');
    const [rows] = await db.query(sql, params);
    return rows;
  },

  async obtenerPorId(id_paquete) {
    const [rows] = await db.query(
      'SELECT * FROM paquete_generado WHERE id_paquete = ?',
      [id_paquete]
    );
    return rows[0] || null;
  },

  async crear({ id_proyecto, ruta_zip, version_scorm, lms_destino }) {
    const [result] = await db.query(
      `INSERT INTO paquete_generado
        (id_proyecto, ruta_zip, version_scorm, lms_destino, fecha_generado)
       VALUES (?, ?, ?, ?, NOW())`,
      [id_proyecto, ruta_zip, version_scorm, lms_destino || null]
    );
    return result.insertId;
  },

  async actualizar(id_paquete, { ruta_zip, version_scorm, lms_destino }) {
    const [result] = await db.query(
      `UPDATE paquete_generado
       SET ruta_zip = ?, version_scorm = ?, lms_destino = ?
       WHERE id_paquete = ?`,
      [ruta_zip, version_scorm, lms_destino || null, id_paquete]
    );
    return result.affectedRows;
  },

  async eliminar(id_paquete) {
    const [result] = await db.query(
      'DELETE FROM paquete_generado WHERE id_paquete = ?',
      [id_paquete]
    );
    return result.affectedRows;
  },
};

module.exports = PaqueteGenerado;
