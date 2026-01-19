// src/models/scorm_runtime_objetivo.model.js
const db = require('../db');

const ScormRuntimeObjetivo = {
  async crear(data) {
    const {
      id_sesion,
      objetivo_id,
      puntuacion_raw,
      puntuacion_min,
      puntuacion_max,
      estado_exito,
      estado_completado,
      medida_progreso,
      descripcion,
    } = data;

    const [result] = await db.query(
      `INSERT INTO scorm_runtime_objetivo
        (id_sesion, objetivo_id, puntuacion_raw, puntuacion_min, puntuacion_max, estado_exito, estado_completado, medida_progreso, descripcion)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id_sesion,
        objetivo_id,
        puntuacion_raw || null,
        puntuacion_min || null,
        puntuacion_max || null,
        estado_exito || null,
        estado_completado || null,
        medida_progreso || null,
        descripcion || null,
      ]
    );
    return result.insertId;
  },

  async actualizarPorSesionYId(id_sesion, objetivo_id, data) {
    const {
      puntuacion_raw,
      puntuacion_min,
      puntuacion_max,
      estado_exito,
      estado_completado,
      medida_progreso,
      descripcion,
    } = data;

    const [result] = await db.query(
      `UPDATE scorm_runtime_objetivo
       SET puntuacion_raw = ?, puntuacion_min = ?, puntuacion_max = ?, estado_exito = ?, estado_completado = ?, medida_progreso = ?, descripcion = ?
       WHERE id_sesion = ? AND objetivo_id = ?`,
      [
        puntuacion_raw || null,
        puntuacion_min || null,
        puntuacion_max || null,
        estado_exito || null,
        estado_completado || null,
        medida_progreso || null,
        descripcion || null,
        id_sesion,
        objetivo_id,
      ]
    );
    return result.affectedRows;
  },

  async guardar(data) {
    const { id_sesion, objetivo_id } = data;
    if (!id_sesion || !objetivo_id) {
      return null;
    }
    const [rows] = await db.query(
      'SELECT id_objetivo FROM scorm_runtime_objetivo WHERE id_sesion = ? AND objetivo_id = ? LIMIT 1',
      [id_sesion, objetivo_id]
    );
    if (rows.length) {
      await this.actualizarPorSesionYId(id_sesion, objetivo_id, data);
      return rows[0].id_objetivo;
    }
    return this.crear(data);
  },
};

module.exports = ScormRuntimeObjetivo;
