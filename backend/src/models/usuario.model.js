const db = require('../db');

const Usuario = {
  async crear({ nombre, email, password_hash, rol }) {
    const sql = `
      INSERT INTO usuario (nombre, email, password_hash, rol)
      VALUES (?, ?, ?, ?)
    `;
    const [result] = await db.query(sql, [nombre, email, password_hash, rol]);
    return result.insertId;
  },

  async obtenerPorEmail(email) {
    const sql = 'SELECT * FROM usuario WHERE email = ?';
    const [rows] = await db.query(sql, [email]);
    return rows[0] || null;
  },
};

module.exports = Usuario;
