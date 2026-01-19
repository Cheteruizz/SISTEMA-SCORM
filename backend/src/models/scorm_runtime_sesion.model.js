// src/models/scorm_runtime_sesion.model.js
const db = require('../db');

const ScormRuntimeSesion = {
  async crear(data) {
    const {
      id_proyecto,
      id_usuario,
      id_manifest,
      id_item,
      id_recurso,
      version_scorm,
      ruta_lanzamiento,
      modo_entrada,
      modo_salida,
      credito,
      modo,
      estado_leccion,
      estado_completado,
      estado_exito,
      puntuacion_raw,
      puntuacion_min,
      puntuacion_max,
      tiempo_total,
      tiempo_sesion,
      datos_suspendidos,
      ubicacion,
      datos_lanzamiento,
      id_aprendiz,
      nombre_aprendiz,
      ultimo_error,
    } = data;

    const [result] = await db.query(
      `INSERT INTO scorm_runtime_sesion
        (id_proyecto, id_usuario, id_manifest, id_item, id_recurso, version_scorm, ruta_lanzamiento, modo_entrada, modo_salida, credito, modo, estado_leccion, estado_completado, estado_exito, puntuacion_raw, puntuacion_min, puntuacion_max, tiempo_total, tiempo_sesion, datos_suspendidos, ubicacion, datos_lanzamiento, id_aprendiz, nombre_aprendiz, ultimo_error)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id_proyecto,
        id_usuario || null,
        id_manifest || null,
        id_item || null,
        id_recurso || null,
        version_scorm || '1.2',
        ruta_lanzamiento || null,
        modo_entrada || null,
        modo_salida || null,
        credito || null,
        modo || null,
        estado_leccion || null,
        estado_completado || null,
        estado_exito || null,
        puntuacion_raw || null,
        puntuacion_min || null,
        puntuacion_max || null,
        tiempo_total || null,
        tiempo_sesion || null,
        datos_suspendidos || null,
        ubicacion || null,
        datos_lanzamiento || null,
        id_aprendiz || null,
        nombre_aprendiz || null,
        ultimo_error || null,
      ]
    );
    return result.insertId;
  },

  async obtenerPorId(id_sesion) {
    const [rows] = await db.query(
      'SELECT * FROM scorm_runtime_sesion WHERE id_sesion = ?',
      [id_sesion]
    );
    return rows[0] || null;
  },

  async actualizar(id_sesion, data) {
    const fields = [];
    const values = [];
    const allowed = [
      'id_manifest',
      'id_item',
      'id_recurso',
      'version_scorm',
      'ruta_lanzamiento',
      'modo_entrada',
      'modo_salida',
      'credito',
      'modo',
      'estado_leccion',
      'estado_completado',
      'estado_exito',
      'puntuacion_raw',
      'puntuacion_min',
      'puntuacion_max',
      'tiempo_total',
      'tiempo_sesion',
      'datos_suspendidos',
      'ubicacion',
      'datos_lanzamiento',
      'id_aprendiz',
      'nombre_aprendiz',
      'ultimo_error',
    ];

    allowed.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        fields.push(`${key} = ?`);
        values.push(data[key]);
      }
    });

    if (!fields.length) return 0;

    values.push(id_sesion);
    const [result] = await db.query(
      `UPDATE scorm_runtime_sesion SET ${fields.join(', ')} WHERE id_sesion = ?`,
      values
    );
    return result.affectedRows;
  },
};

module.exports = ScormRuntimeSesion;
