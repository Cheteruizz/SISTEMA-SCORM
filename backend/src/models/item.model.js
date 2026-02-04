// src/models/item.model.js
const db = require('../db');

const Item = {
  async obtenerTodos(filtros = {}) {
    const where = [];
    const params = [];

    if (filtros.id_organizacion) {
      where.push('id_organizacion = ?');
      params.push(filtros.id_organizacion);
    }
    if (filtros.id_padre) {
      where.push('id_padre = ?');
      params.push(filtros.id_padre);
    }

    const sql = 'SELECT * FROM item' + (where.length ? ` WHERE ${where.join(' AND ')}` : '');
    const [rows] = await db.query(sql, params);
    return rows;
  },

  async obtenerPorId(id_item) {
    const [rows] = await db.query('SELECT * FROM item WHERE id_item = ?', [id_item]);
    return rows[0] || null;
  },

  async crear({
    id_organizacion,
    id_padre,
    identificador,
    titulo,
    tipo_item,
    orden,
    es_lanzable,
    id_modulo,
    id_leccion,
    id_recurso,
    sequencing_xml,
    navigation_xml,
  }) {
    const [result] = await db.query(
      `INSERT INTO item
        (id_organizacion, id_padre, identificador, titulo, tipo_item, orden, es_lanzable, id_modulo, id_leccion, id_recurso, sequencing_xml, navigation_xml)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id_organizacion,
        id_padre || null,
        identificador,
        titulo,
        tipo_item || 'sco',
        orden || 1,
        es_lanzable ? 1 : 0,
        id_modulo || null,
        id_leccion || null,
        id_recurso || null,
        sequencing_xml || null,
        navigation_xml || null,
      ]
    );
    return result.insertId;
  },

  async actualizar(
    id_item,
    {
      id_padre,
      identificador,
      titulo,
      tipo_item,
      orden,
      es_lanzable,
      id_modulo,
      id_leccion,
      id_recurso,
      sequencing_xml,
      navigation_xml,
    }
  ) {
    const [result] = await db.query(
      `UPDATE item
       SET id_padre = ?, identificador = ?, titulo = ?, tipo_item = ?, orden = ?, es_lanzable = ?, id_modulo = ?, id_leccion = ?, id_recurso = ?, sequencing_xml = ?, navigation_xml = ?
       WHERE id_item = ?`,
      [
        id_padre || null,
        identificador,
        titulo,
        tipo_item || 'sco',
        orden || 1,
        es_lanzable ? 1 : 0,
        id_modulo || null,
        id_leccion || null,
        id_recurso || null,
        sequencing_xml || null,
        navigation_xml || null,
        id_item,
      ]
    );
    return result.affectedRows;
  },

  async eliminar(id_item) {
    const [result] = await db.query('DELETE FROM item WHERE id_item = ?', [id_item]);
    return result.affectedRows;
  },
};

module.exports = Item;
