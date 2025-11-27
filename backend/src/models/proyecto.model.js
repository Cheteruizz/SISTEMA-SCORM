const db = require('../db');

const Proyecto = {
    async obtenerTodos() {
        const [rows] = await db.query('SELECT * FROM proyecto_scorm');
        return rows;
    },

    async obtenerPorId(id) {
        const [rows] = await db.query(
            'SELECT * FROM proyecto_scorm WHERE id_proyecto = ?',
            [id]
        );
        return rows[0];
    },

    async crearProyecto({ id_usuario, nombre_proyecto, version }) {
        const [result] = await db.query(
            `INSERT INTO proyecto_scorm (id_usuario, nombre_proyecto, version, fecha_creacion, fecha_modificacion)
             VALUES (?, ?, ?, NOW(), NOW())`,
            [id_usuario, nombre_proyecto, version]
        );
        return result.insertId;
    },

    async actualizarProyecto(id, { nombre_proyecto, version }) {
        await db.query(
            `UPDATE proyecto_scorm 
             SET nombre_proyecto = ?, version = ?, fecha_modificacion = NOW()
             WHERE id_proyecto = ?`,
            [nombre_proyecto, version, id]
        );
    },

    async eliminarProyecto(id) {
        await db.query(
            `DELETE FROM proyecto_scorm WHERE id_proyecto = ?`,
            [id]
        );
    }
};

module.exports = Proyecto;
