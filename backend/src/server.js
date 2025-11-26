const express = require('express');
const app = express();
const port = 3000;

// Middleware
app.use(express.json());

// Rutas
const usuarioRoutes = require('./routes/usuario.routes');
const proyectoRoutes = require('./routes/proyecto.routes');

app.use('/usuarios', usuarioRoutes);
app.use('/proyectos', proyectoRoutes);

// Prueba raíz
app.get('/', (req, res) => {
    res.send('Backend SCORM funcionando correctamente');
});

// Puerto
app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});
