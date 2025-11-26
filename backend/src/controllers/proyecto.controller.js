const Proyecto = require('../models/proyecto.model');

// GET /proyectos
async function obtenerProyectos(req, res) {
    try {
        const proyectos = await Proyecto.getAllProyectos();
        res.json(proyectos);
    } catch (error) {
        console.error('Error obteniendo proyectos:', error);
        res.status(500).json({ error: 'Error obteniendo proyectos' });
    }
}

// GET /proyectos/:id
async function obtenerProyectoPorId(req, res) {
    try {
        const id = parseInt(req.params.id, 10);
        const proyecto = await Proyecto.getProyectoById(id);

        if (!proyecto) {
            return res.status(404).json({ error: 'Proyecto no encontrado' });
        }

        res.json(proyecto);
    } catch (error) {
        console.error('Error obteniendo proyecto:', error);
        res.status(500).json({ error: 'Error obteniendo proyecto' });
    }
}

// POST /proyectos
async function crearProyecto(req, res) {
    try {
        const { id_usuario, nombre_proyecto, version } = req.body;

        if (!id_usuario || !nombre_proyecto) {
            return res.status(400).json({
                error: 'id_usuario y nombre_proyecto son obligatorios'
            });
        }

        const idNuevo = await Proyecto.createProyecto({
            id_usuario,
            nombre_proyecto,
            version: version || '1.0'
        });

        res.status(201).json({
            mensaje: 'Proyecto creado correctamente',
            id_proyecto: idNuevo
        });
    } catch (error) {
        console.error('Error creando proyecto:', error);

        if (error.tipo === 'USUARIO_NO_EXISTE') {
            return res.status(400).json({ error: error.message });
        }

        res.status(500).json({ error: 'Error creando proyecto' });
    }
}

// PUT /proyectos/:id
async function actualizarProyecto(req, res) {
    try {
        const id = parseInt(req.params.id, 10);
        const { nombre_proyecto, version } = req.body;

        if (!nombre_proyecto || !version) {
            return res.status(400).json({
                error: 'nombre_proyecto y version son obligatorios para actualizar'
            });
        }

        const afectados = await Proyecto.updateProyecto(id, {
            nombre_proyecto,
            version
        });

        if (afectados === 0) {
            return res.status(404).json({ error: 'Proyecto no encontrado' });
        }

        res.json({ mensaje: 'Proyecto actualizado correctamente' });
    } catch (error) {
        console.error('Error actualizando proyecto:', error);
        res.status(500).json({ error: 'Error actualizando proyecto' });
    }
}

// DELETE /proyectos/:id
async function eliminarProyecto(req, res) {
    try {
        const id = parseInt(req.params.id, 10);
        const afectados = await Proyecto.deleteProyecto(id);

        if (afectados === 0) {
            return res.status(404).json({ error: 'Proyecto no encontrado' });
        }

        res.json({ mensaje: 'Proyecto eliminado correctamente' });
    } catch (error) {
        console.error('Error eliminando proyecto:', error);
        res.status(500).json({ error: 'Error eliminando proyecto' });
    }
}

module.exports = {
    obtenerProyectos,
    obtenerProyectoPorId,
    crearProyecto,
    actualizarProyecto,
    eliminarProyecto
};
