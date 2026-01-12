require('dotenv').config();
const express = require('express');
const cors = require('cors');

const usuarioRoutes = require('./routes/usuario.routes');
const proyectoRoutes = require('./routes/proyecto.routes');
const archivoRoutes = require('./routes/archivo.routes');
const moduloRoutes = require('./routes/modulo.routes');
const leccionRoutes = require('./routes/leccion.routes');
const manifestRoutes = require('./routes/manifest.routes');
const organizacionRoutes = require('./routes/organizacion.routes');
const itemRoutes = require('./routes/item.routes');
const recursoRoutes = require('./routes/recurso.routes');
const paqueteRoutes = require('./routes/paquete_generado.routes');
const metadataRoutes = require('./routes/proyecto_metadata.routes');
const scormRoutes = require('./routes/scorm.routes');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/usuarios', usuarioRoutes);
app.use('/api/proyectos', proyectoRoutes);
app.use('/api/archivos', archivoRoutes);
app.use('/api/modulos', moduloRoutes);
app.use('/api/lecciones', leccionRoutes);
app.use('/api/manifests', manifestRoutes);
app.use('/api/organizaciones', organizacionRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/recursos', recursoRoutes);
app.use('/api/paquetes', paqueteRoutes);
app.use('/api/metadata', metadataRoutes);
app.use('/api/scorm', scormRoutes);

app.get('/', (req, res) => {
  res.send('Backend SCORM funcionando correctamente');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
