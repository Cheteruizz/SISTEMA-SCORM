require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

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
const runtimeRoutes = require('./routes/scorm_runtime.routes');
const scoRoutes = require('./routes/scorm_sco.routes');

const app = express();

const corsOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
app.use(
  cors(
    corsOrigins.length
      ? {
          origin: corsOrigins,
          credentials: true,
        }
      : undefined
  )
);
app.use(express.json());

const baseDir = path.resolve(__dirname, '..');
const uploadDir = process.env.UPLOAD_DIR || path.join(baseDir, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

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
app.use('/api/scorm/runtime', runtimeRoutes);
app.use('/api/scorm/sco', scoRoutes);

app.get('/', (req, res) => {
  res.send('Backend SCORM funcionando correctamente');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
