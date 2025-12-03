const bcrypt = require("bcrypt");
const Usuario = require("../models/usuario.model");

// Expresiones regulares de validación
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const nombreRegex = /^[A-Za-zÁÉÍÓÚáéíóúñÑ ]{3,}$/;
const MIN_PASSWORD = 4;

exports.registrar = async (req, res) => {
    try {
        const { nombre, email, password } = req.body;

        // === VALIDACIONES ===
        if (!email || !emailRegex.test(email)) {
            return res.status(400).json({ mensaje: "Email inválido" });
        }

        if (!password || password.length < MIN_PASSWORD) {
            return res.status(400).json({ mensaje: "La contraseña es demasiado corta" });
        }

        if (!nombre || !nombreRegex.test(nombre)) {
            return res.status(400).json({ mensaje: "El nombre no es válido" });
        }

        // Comprobar si existe email
        Usuario.obtenerPorEmail(email, async (err, usuarioExistente) => {
            if (usuarioExistente) {
                return res.status(400).json({ mensaje: "El email ya está registrado" });
            }

            const password_hash = await bcrypt.hash(password, 10);

            Usuario.crear({ nombre, email, password_hash }, (err, resultado) => {
                if (err) {
                    console.error("Error al registrar:", err);
                    return res.status(500).json({ mensaje: "Error al registrar usuario" });
                }

                return res.json({
                    mensaje: "Usuario registrado correctamente",
                    id_usuario: resultado.insertId
                });
            });
        });
    } catch (err) {
        console.error("Error interno:", err);
        return res.status(500).json({ mensaje: "Error interno del servidor" });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ mensaje: "Faltan datos" });
        }

        Usuario.obtenerPorEmail(email, async (err, usuario) => {
            if (!usuario) {
                return res.status(400).json({ mensaje: "Credenciales incorrectas" });
            }

            const contraseñaCorrecta = await bcrypt.compare(password, usuario.password_hash);

            if (!contraseñaCorrecta) {
                return res.status(400).json({ mensaje: "Credenciales incorrectas" });
            }

            return res.json({
                mensaje: "Login correcto",
                usuario
            });
        });
    } catch (err) {
        console.error("Error login:", err);
        return res.status(500).json({ mensaje: "Error interno del servidor" });
    }
};
