const pool = require('../db');

// Obtener todos los usuarios
async function getAllUsuarios() {
    const [rows] = await pool.query('SELECT * FROM usuario');
    return rows;
}

// Crear usuario
async function createUsuario({ nombre, correo_electronico, apellido, contrasena }) {
    const [result] = await pool.query(
        'INSERT INTO usuario (nombre, correo_electronico, apellido, contrasena) VALUES (?, ?, ?, ?)',
        [nombre, correo_electronico, apellido, contrasena]
    );
    return result.insertId;
}

module.exports = {
    getAllUsuarios,
    createUsuario
};
