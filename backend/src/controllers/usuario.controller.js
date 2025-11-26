const Usuario = require('../models/usuario.model');

// GET → obtener todos los usuarios
async function obtenerUsuarios(req, res) {
    try {
        const usuarios = await Usuario.getAllUsuarios();
        res.json(usuarios);
    } catch (error) {
        console.error("Error obteniendo usuarios:", error);
        res.status(500).json({ error: 'Error obteniendo usuarios' });
    }
}

// POST → crear un nuevo usuario
async function crearUsuario(req, res) {
    try {
        const id = await Usuario.createUsuario(req.body);
        res.json({
            mensaje: 'Usuario creado correctamente',
            id: id
        });
    } catch (error) {
        console.error("Error creando usuario:", error);
        res.status(500).json({ error: 'Error creando usuario' });
    }
}

module.exports = {
    obtenerUsuarios,
    crearUsuario
};
