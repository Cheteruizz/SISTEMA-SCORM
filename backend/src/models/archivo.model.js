// src/models/archivo.model.js
const db = require('../db');

const Archivo = {
  async obtenerTodos(filtros = {}) {
    const where = [];
    const params = [];

    if (filtros.id_proyecto) {
      where.push('id_proyecto = ?');
      params.push(filtros.id_proyecto);
    }
    if (filtros.id_leccion) {
      where.push('id_leccion = ?');
      params.push(filtros.id_leccion);
    }

    const sql =
      'SELECT * FROM archivo' + (where.length ? ` WHERE ${where.join(' AND ')}` : '');
    const [rows] = await db.query(sql, params);
    return rows;
  },

  async obtenerPorId(id_archivo) {
    const [rows] = await db.query('SELECT * FROM archivo WHERE id_archivo = ?', [
      id_archivo,
    ]);
    return rows[0] || null;
  },

  async crear({
    id_proyecto,
    id_leccion,
    nombre_original,
    nombre_fisico,
    tipo_mime,
    tamano_bytes,
    ruta,
  }) {
    const [result] = await db.query(
      `INSERT INTO archivo
        (id_proyecto, id_leccion, nombre_original, nombre_fisico, tipo_mime, tamano_bytes, ruta, fecha_subida)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        id_proyecto,
        id_leccion || null,
        nombre_original,
        nombre_fisico,
        tipo_mime,
        tamano_bytes || null,
        ruta,
      ]
    );
    return result.insertId;
  },

  async actualizar(
    id_archivo,
    { id_leccion, nombre_original, nombre_fisico, tipo_mime, tamano_bytes, ruta }
  ) {
    const [result] = await db.query(
      `UPDATE archivo
       SET id_leccion = ?, nombre_original = ?, nombre_fisico = ?, tipo_mime = ?, tamano_bytes = ?, ruta = ?
       WHERE id_archivo = ?`,
      [
        id_leccion || null,
        nombre_original,
        nombre_fisico,
        tipo_mime,
        tamano_bytes || null,
        ruta,
        id_archivo,
      ]
    );
    return result.affectedRows;
  },

  async eliminar(id_archivo) {
    const [result] = await db.query('DELETE FROM archivo WHERE id_archivo = ?', [
      id_archivo,
    ]);
    return result.affectedRows;
  },

  async obtenerTotalesPorProyecto(id_proyecto) {
    const [rows] = await db.query(
      'SELECT COUNT(*) AS total_archivos, COALESCE(SUM(tamano_bytes), 0) AS total_bytes FROM archivo WHERE id_proyecto = ?',
      [id_proyecto]
    );
    return rows[0] || { total_archivos: 0, total_bytes: 0 };
  },
};

module.exports = Archivo;
