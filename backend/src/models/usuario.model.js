const db = require('../db');

const Usuario = {
    async obtenerTodos() {
        const [rows] = await db.promise().query('SELECT * FROM usuario');
        return rows;
    }
};

module.exports = Usuario;
