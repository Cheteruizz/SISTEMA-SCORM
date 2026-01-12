const bcrypt = require('bcrypt');
const Usuario = require('../models/usuario.model');

// Expresiones regulares de validacion
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const nombreRegex = /^[A-Za-z' ]{3,}$/;
const MIN_PASSWORD = 4;

exports.registrar = async (req, res) => {
  try {
    const { nombre, email, password } = req.body;

    // === VALIDACIONES ===
    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({ mensaje: 'Email invalido' });
    }

    if (!password || password.length < MIN_PASSWORD) {
      return res.status(400).json({ mensaje: 'La contrasena es demasiado corta' });
    }

    if (!nombre || !nombreRegex.test(nombre)) {
      return res.status(400).json({ mensaje: 'El nombre no es valido' });
    }

    // Comprobar si existe email
    const usuarioExistente = await Usuario.obtenerPorEmail(email);
    if (usuarioExistente) {
      return res.status(400).json({ mensaje: 'El email ya esta registrado' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const id_usuario = await Usuario.crear({
      nombre,
      email,
      password_hash,
      rol: 'autor',
    });

    return res.json({
      mensaje: 'Usuario registrado correctamente',
      id_usuario,
    });
  } catch (err) {
    console.error('Error interno:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ mensaje: 'Faltan datos' });
    }

    const usuario = await Usuario.obtenerPorEmail(email);
    if (!usuario) {
      return res.status(400).json({ mensaje: 'Credenciales incorrectas' });
    }

    const contrasenaCorrecta = await bcrypt.compare(password, usuario.password_hash);
    if (!contrasenaCorrecta) {
      return res.status(400).json({ mensaje: 'Credenciales incorrectas' });
    }

    const { password_hash, ...usuarioSeguro } = usuario;
    return res.json({
      mensaje: 'Login correcto',
      usuario: usuarioSeguro,
    });
  } catch (err) {
    console.error('Error login:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};
