const pool = require('../db');

// Obtener todos los proyectos
async function getAllProyectos() {
    const [rows] = await pool.query(
        `SELECT p.*, u.nombre AS nombre_usuario, u.correo_electronico
         FROM proyecto_scorm p
         JOIN usuario u ON p.id_usuario = u.id_usuario
         ORDER BY p.fecha_creacion DESC`
    );
    return rows;
}

// Obtener proyecto por id
async function getProyectoById(id_proyecto) {
    const [rows] = await pool.query(
        `SELECT p.*, u.nombre AS nombre_usuario, u.correo_electronico
         FROM proyecto_scorm p
         JOIN usuario u ON p.id_usuario = u.id_usuario
         WHERE p.id_proyecto = ?`,
        [id_proyecto]
    );
    return rows[0] || null;
}

// Comprobar si existe usuario
async function existeUsuario(id_usuario) {
    const [rows] = await pool.query(
        'SELECT id_usuario FROM usuario WHERE id_usuario = ?',
        [id_usuario]
    );
    return rows.length > 0;
}

// Crear proyecto
async function createProyecto({ id_usuario, nombre_proyecto, version }) {
    // Validar que existe el usuario
    const usuarioOk = await existeUsuario(id_usuario);
    if (!usuarioOk) {
        const error = new Error('El usuario indicado no existe');
        error.tipo = 'USUARIO_NO_EXISTE';
        throw error;
    }

    const [result] = await pool.query(
        `INSERT INTO proyecto_scorm 
            (id_usuario, nombre_proyecto, version, fecha_creacion, fecha_modificacion)
         VALUES (?, ?, ?, NOW(), NOW())`,
        [id_usuario, nombre_proyecto, version]
    );
    return result.insertId;
}

// Actualizar proyecto
async function updateProyecto(id_proyecto, { nombre_proyecto, version }) {
    const [result] = await pool.query(
        `UPDATE proyecto_scorm
         SET nombre_proyecto = ?, 
             version = ?, 
             fecha_modificacion = NOW()
         WHERE id_proyecto = ?`,
        [nombre_proyecto, version, id_proyecto]
    );
    return result.affectedRows; // 0 = no existe, 1 = actualizado
}

// Eliminar proyecto
async function deleteProyecto(id_proyecto) {
    const [result] = await pool.query(
        'DELETE FROM proyecto_scorm WHERE id_proyecto = ?',
        [id_proyecto]
    );
    return result.affectedRows;
}

module.exports = {
    getAllProyectos,
    getProyectoById,
    createProyecto,
    updateProyecto,
    deleteProyecto
};
