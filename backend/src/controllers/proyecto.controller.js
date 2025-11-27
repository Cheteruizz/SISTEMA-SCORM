const Proyecto = require('../models/proyecto.model');

exports.getAllProyectos = async (req, res) => {
    try {
        const proyectos = await Proyecto.obtenerTodos();
        res.json(proyectos);
    } catch (err) {
        console.error("Error obteniendo proyectos:", err);
        res.status(500).json({ error: "Error obteniendo proyectos" });
    }
};

exports.getProyectoById = async (req, res) => {
    try {
        const proyecto = await Proyecto.obtenerPorId(req.params.id);

        if (!proyecto) {
            return res.status(404).json({ error: "Proyecto no encontrado" });
        }

        res.json(proyecto);
    } catch (err) {
        console.error("Error obteniendo proyecto:", err);
        res.status(500).json({ error: "Error obteniendo proyecto" });
    }
};

exports.createProyecto = async (req, res) => {
    try {
        const { id_usuario, nombre_proyecto, version } = req.body;

        if (!id_usuario || !nombre_proyecto || !version) {
            return res.status(400).json({ error: "Faltan datos obligatorios" });
        }

        const nuevoId = await Proyecto.crearProyecto({ id_usuario, nombre_proyecto, version });

        res.json({ mensaje: "Proyecto creado", id: nuevoId });
    } catch (err) {
        console.error("Error creando proyecto:", err);
        res.status(500).json({ error: "Error creando proyecto" });
    }
};

exports.updateProyecto = async (req, res) => {
    try {
        const { nombre_proyecto, version } = req.body;

        await Proyecto.actualizarProyecto(req.params.id, { nombre_proyecto, version });

        res.json({ mensaje: "Proyecto actualizado" });
    } catch (err) {
        console.error("Error actualizando proyecto:", err);
        res.status(500).json({ error: "Error actualizando proyecto" });
    }
};

exports.deleteProyecto = async (req, res) => {
    try {
        await Proyecto.eliminarProyecto(req.params.id);

        res.json({ mensaje: "Proyecto eliminado" });
    } catch (err) {
        console.error("Error eliminando proyecto:", err);
        res.status(500).json({ error: "Error eliminando proyecto" });
    }
};
