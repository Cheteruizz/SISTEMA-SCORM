// src/models/proyecto_metadata.model.js
const db = require('../db');

const ProyectoMetadata = {
  async obtenerTodos(filtros = {}) {
    const where = [];
    const params = [];

    if (filtros.id_proyecto) {
      where.push('id_proyecto = ?');
      params.push(filtros.id_proyecto);
    }

    const sql =
      'SELECT * FROM proyecto_metadata' +
      (where.length ? ` WHERE ${where.join(' AND ')}` : '');
    const [rows] = await db.query(sql, params);
    return rows;
  },

  async obtenerPorId(id_metadata) {
    const [rows] = await db.query(
      'SELECT * FROM proyecto_metadata WHERE id_metadata = ?',
      [id_metadata]
    );
    return rows[0] || null;
  },

  async crear({
    id_proyecto,
    idioma,
    autor_principal,
    organizacion,
    entidad_publicadora,
    palabras_clave,
    nivel_dificultad,
    objetivo,
    descripcion_detallada,
  }) {
    const [result] = await db.query(
      `INSERT INTO proyecto_metadata
        (id_proyecto, idioma, autor_principal, organizacion, entidad_publicadora, palabras_clave, nivel_dificultad, objetivo, descripcion_detallada)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id_proyecto,
        idioma || 'es',
        autor_principal || null,
        organizacion || null,
        entidad_publicadora || null,
        palabras_clave || null,
        nivel_dificultad || null,
        objetivo || null,
        descripcion_detallada || null,
      ]
    );
    return result.insertId;
  },

  async actualizar(
    id_metadata,
    {
      idioma,
      autor_principal,
      organizacion,
      entidad_publicadora,
      palabras_clave,
      nivel_dificultad,
      objetivo,
      descripcion_detallada,
    }
  ) {
    const [result] = await db.query(
      `UPDATE proyecto_metadata
       SET idioma = ?, autor_principal = ?, organizacion = ?, entidad_publicadora = ?, palabras_clave = ?, nivel_dificultad = ?, objetivo = ?, descripcion_detallada = ?
       WHERE id_metadata = ?`,
      [
        idioma || 'es',
        autor_principal || null,
        organizacion || null,
        entidad_publicadora || null,
        palabras_clave || null,
        nivel_dificultad || null,
        objetivo || null,
        descripcion_detallada || null,
        id_metadata,
      ]
    );
    return result.affectedRows;
  },

  async eliminar(id_metadata) {
    const [result] = await db.query(
      'DELETE FROM proyecto_metadata WHERE id_metadata = ?',
      [id_metadata]
    );
    return result.affectedRows;
  },
};

module.exports = ProyectoMetadata;
