// src/models/scorm_runtime_cmi.model.js
const db = require('../db');

const ScormRuntimeCmi = {
  async guardar(id_sesion, clave_cmi, valor_cmi) {
    const [result] = await db.query(
      `INSERT INTO scorm_runtime_cmi (id_sesion, clave_cmi, valor_cmi)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE valor_cmi = VALUES(valor_cmi)`,
      [id_sesion, clave_cmi, valor_cmi]
    );
    return result.affectedRows;
  },

  async guardarLote(id_sesion, items = []) {
    if (!items.length) return 0;
    const values = items.map((item) => [id_sesion, item.clave_cmi, item.valor_cmi]);
    const [result] = await db.query(
      `INSERT INTO scorm_runtime_cmi (id_sesion, clave_cmi, valor_cmi)
       VALUES ?
       ON DUPLICATE KEY UPDATE valor_cmi = VALUES(valor_cmi)`,
      [values]
    );
    return result.affectedRows;
  },

  async obtenerPorSesion(id_sesion, prefix) {
    if (prefix) {
      const [rows] = await db.query(
        'SELECT clave_cmi, valor_cmi FROM scorm_runtime_cmi WHERE id_sesion = ? AND clave_cmi LIKE ?',
        [id_sesion, `${prefix}%`]
      );
      return rows;
    }
    const [rows] = await db.query(
      'SELECT clave_cmi, valor_cmi FROM scorm_runtime_cmi WHERE id_sesion = ?',
      [id_sesion]
    );
    return rows;
  },
};

module.exports = ScormRuntimeCmi;
