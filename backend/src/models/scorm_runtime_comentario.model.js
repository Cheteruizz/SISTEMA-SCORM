// src/models/scorm_runtime_comentario.model.js
const db = require('../db');

const ScormRuntimeComentario = {
  async crear(data) {
    const { id_sesion, tipo_comentario, texto_comentario, ubicacion, marca_tiempo } =
      data;

    const [result] = await db.query(
      `INSERT INTO scorm_runtime_comentario
        (id_sesion, tipo_comentario, texto_comentario, ubicacion, marca_tiempo)
       VALUES (?, ?, ?, ?, ?)`,
      [
        id_sesion,
        tipo_comentario || 'aprendiz',
        texto_comentario,
        ubicacion || null,
        marca_tiempo || null,
      ]
    );
    return result.insertId;
  },
};

module.exports = ScormRuntimeComentario;
