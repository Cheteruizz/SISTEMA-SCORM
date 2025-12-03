// src/models/proyecto.model.js
const db = require('../db');

const Proyecto = {
  // Obtener todos los proyectos
  async obtenerTodos() {
    const [rows] = await db.query('SELECT * FROM proyecto_scorm');
    return rows;
  },

  // Crear un nuevo proyecto
  async crear({ id_usuario, titulo, descripcion, version_scorm, estado }) {
    const [result] = await db.query(
      `INSERT INTO proyecto_scorm 
        (id_usuario, titulo, descripcion, version_scorm, estado, fecha_creacion, ultima_modificacion)
       VALUES (?, ?, ?, ?, ?, NOW(), NULL)`,
      [id_usuario, titulo, descripcion, version_scorm, estado]
    );

    return result.insertId;
  },
};

module.exports = Proyecto;
