// src/models/scorm_runtime_interaccion.model.js
const db = require('../db');

const ScormRuntimeInteraccion = {
  async crear(data) {
    const {
      id_sesion,
      interaccion_id,
      tipo_interaccion,
      objetivos_ids,
      respuesta_aprendiz,
      resultado,
      ponderacion,
      latencia,
      marca_tiempo,
      descripcion,
    } = data;

    const [result] = await db.query(
      `INSERT INTO scorm_runtime_interaccion
        (id_sesion, interaccion_id, tipo_interaccion, objetivos_ids, respuesta_aprendiz, resultado, ponderacion, latencia, marca_tiempo, descripcion)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id_sesion,
        interaccion_id,
        tipo_interaccion || null,
        objetivos_ids || null,
        respuesta_aprendiz || null,
        resultado || null,
        ponderacion || null,
        latencia || null,
        marca_tiempo || null,
        descripcion || null,
      ]
    );
    return result.insertId;
  },

  async actualizarPorSesionYId(id_sesion, interaccion_id, data) {
    const {
      tipo_interaccion,
      objetivos_ids,
      respuesta_aprendiz,
      resultado,
      ponderacion,
      latencia,
      marca_tiempo,
      descripcion,
    } = data;

    const [result] = await db.query(
      `UPDATE scorm_runtime_interaccion
       SET tipo_interaccion = ?, objetivos_ids = ?, respuesta_aprendiz = ?, resultado = ?, ponderacion = ?, latencia = ?, marca_tiempo = ?, descripcion = ?
       WHERE id_sesion = ? AND interaccion_id = ?`,
      [
        tipo_interaccion || null,
        objetivos_ids || null,
        respuesta_aprendiz || null,
        resultado || null,
        ponderacion || null,
        latencia || null,
        marca_tiempo || null,
        descripcion || null,
        id_sesion,
        interaccion_id,
      ]
    );
    return result.affectedRows;
  },

  async guardar(data) {
    const { id_sesion, interaccion_id } = data;
    if (!id_sesion || !interaccion_id) {
      return null;
    }
    const [rows] = await db.query(
      'SELECT id_interaccion FROM scorm_runtime_interaccion WHERE id_sesion = ? AND interaccion_id = ? LIMIT 1',
      [id_sesion, interaccion_id]
    );
    if (rows.length) {
      await this.actualizarPorSesionYId(id_sesion, interaccion_id, data);
      return rows[0].id_interaccion;
    }
    return this.crear(data);
  },
};

module.exports = ScormRuntimeInteraccion;
