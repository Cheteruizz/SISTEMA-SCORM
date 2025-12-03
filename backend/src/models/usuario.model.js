const db = require('../db');

const Usuario = {
    crear: (nombre, email, password_hash, rol, callback) => {
        const sql = `
            INSERT INTO usuario (nombre, email, password_hash, rol)
            VALUES (?, ?, ?, ?)
        `;
        db.query(sql, [nombre, email, password_hash, rol], callback);
    },

    obtenerPorEmail: (email, callback) => {
        const sql = "SELECT * FROM usuario WHERE email = ?";
        db.query(sql, [email], callback);
    }
};

module.exports = Usuario;
