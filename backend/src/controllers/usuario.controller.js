const Usuario = require('../models/usuario.model');

exports.obtenerUsuarios = async (req, res) => {
    try {
        const usuarios = await Usuario.obtenerTodos();
        res.json(usuarios);
    } catch (error) {
        console.error('Error obteniendo usuarios:', error);
        res.status(500).json({ error: 'Error obteniendo usuarios' });
    }
};
