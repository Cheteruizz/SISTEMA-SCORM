// src/models/scorm_sco_archivo.model.js
const db = require('../db');

const ScormScoArchivo = {
  async obtenerPorSco(id_sco) {
    const [rows] = await db.query(
      'SELECT * FROM scorm_sco_archivo WHERE id_sco = ?',
      [id_sco]
    );
    return rows;
  },

  async crear({ id_sco, id_archivo, ruta_relativa, es_entrada }) {
    const [result] = await db.query(
      `INSERT INTO scorm_sco_archivo
        (id_sco, id_archivo, ruta_relativa, es_entrada)
       VALUES (?, ?, ?, ?)`,
      [id_sco, id_archivo || null, ruta_relativa, es_entrada ? 1 : 0]
    );
    return result.insertId;
  },

  async eliminar(id_sco_archivo) {
    const [result] = await db.query(
      'DELETE FROM scorm_sco_archivo WHERE id_sco_archivo = ?',
      [id_sco_archivo]
    );
    return result.affectedRows;
  },

  async eliminarPorSco(id_sco) {
    const [result] = await db.query(
      'DELETE FROM scorm_sco_archivo WHERE id_sco = ?',
      [id_sco]
    );
    return result.affectedRows;
  },
};

module.exports = ScormScoArchivo;
