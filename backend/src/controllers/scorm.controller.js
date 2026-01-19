// src/controllers/scorm.controller.js
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const db = require('../db');
const PaqueteGenerado = require('../models/paquete_generado.model');
const {
  buildManifestXml,
  buildManifestXml2004,
  normalizeRelativePath,
  resolveArchivoPath,
  ensureFileExists,
  validateScormData,
} = require('../services/scorm12');

const CONTENT_PREFIX = 'content';

const validarProyecto = async (req, res) => {
  try {
    const { id_proyecto } = req.params;

    const [manifestRows] = await db.query(
      'SELECT * FROM manifest WHERE id_proyecto = ?',
      [id_proyecto]
    );
    if (manifestRows.length > 1) {
      return res
        .status(400)
        .json({ mensaje: 'Existe mas de un manifest para el proyecto' });
    }
    const manifest = manifestRows[0];
    if (!manifest) {
      return res.status(400).json({ mensaje: 'No existe manifest para el proyecto' });
    }

    const [proyectoRows] = await db.query(
      'SELECT * FROM proyecto_scorm WHERE id_proyecto = ?',
      [id_proyecto]
    );
    const proyecto = proyectoRows[0] || null;

    const [metadataRows] = await db.query(
      'SELECT * FROM proyecto_metadata WHERE id_proyecto = ?',
      [id_proyecto]
    );
    const metadata = metadataRows[0] || null;

    const [orgRows] = await db.query(
      'SELECT * FROM organizacion WHERE id_manifest = ?',
      [manifest.id_manifest]
    );
    if (!orgRows.length) {
      return res.status(400).json({ mensaje: 'No existen organizaciones en el manifest' });
    }

    const [itemsRows] = await db.query(
      'SELECT i.*, r.identificador AS recurso_identificador FROM item i LEFT JOIN recurso r ON i.id_recurso = r.id_recurso WHERE i.id_organizacion IN (?)',
      [orgRows.map((o) => o.id_organizacion)]
    );

    const [recursosRows] = await db.query(
      `SELECT r.*, a.nombre_fisico, a.ruta
       FROM recurso r
       INNER JOIN archivo a ON r.id_archivo = a.id_archivo
       WHERE r.id_manifest = ?`,
      [manifest.id_manifest]
    );
    if (!recursosRows.length) {
      return res.status(400).json({ mensaje: 'No existen recursos para el manifest' });
    }

    const [archivosRows] = await db.query(
      'SELECT * FROM archivo WHERE id_proyecto = ?',
      [id_proyecto]
    );

    const errores = validateScormData({
      manifest,
      organizaciones: orgRows,
      items: itemsRows,
      recursos: recursosRows,
      archivos: archivosRows,
    });

    const baseDir = path.resolve(__dirname, '..');
    const uploadDir = process.env.UPLOAD_DIR || path.join(baseDir, 'uploads');

    const resourceErrors = [];
    const hasSco = recursosRows.some((recurso) => (recurso.scorm_type || 'sco') === 'sco');
    if (!hasSco) {
      resourceErrors.push('El manifest no contiene recursos tipo SCO');
    }

    for (const recurso of recursosRows) {
      const filePath = resolveArchivoPath(recurso.ruta, uploadDir);
      const zipPathName = normalizeRelativePath(recurso.href || recurso.nombre_fisico);
      if (!filePath || !ensureFileExists(filePath) || !zipPathName) {
        resourceErrors.push(`Archivo o ruta invalida para recurso: ${recurso.identificador}`);
      }
    }

    for (const archivo of archivosRows) {
      const filePath = resolveArchivoPath(archivo.ruta, uploadDir);
      const zipPathName = normalizeRelativePath(archivo.ruta || archivo.nombre_fisico);
      if (!filePath || !ensureFileExists(filePath) || !zipPathName) {
        resourceErrors.push(`Archivo o ruta invalida: ${archivo.nombre_fisico}`);
      }
    }

    const warnings = [];
    if (!metadata) {
      warnings.push('Proyecto sin metadata');
    } else {
      if (!metadata.autor_principal) {
        warnings.push('Metadata sin autor principal');
      }
      if (!metadata.entidad_publicadora) {
        warnings.push('Metadata sin entidad publicadora');
      }
    }
    if (!proyecto || !proyecto.titulo) {
      warnings.push('Proyecto sin titulo');
    }

    const allErrors = [...errores, ...resourceErrors];
    return res.json({
      valido: allErrors.length === 0,
      errores: allErrors,
      warnings,
    });
  } catch (err) {
    console.error('Error al validar SCORM:', err);
    return res.status(500).json({ mensaje: 'Error al validar SCORM' });
  }
};

const generarPaquete12 = async (req, res) => {
  try {
    const { id_proyecto } = req.params;
    let responded = false;
    let hasError = false;

    const [manifestRows] = await db.query(
      'SELECT * FROM manifest WHERE id_proyecto = ?',
      [id_proyecto]
    );
    if (manifestRows.length > 1) {
      return res
        .status(400)
        .json({ mensaje: 'Existe mas de un manifest para el proyecto' });
    }
    const manifest = manifestRows[0];
    if (!manifest) {
      return res.status(400).json({ mensaje: 'No existe manifest para el proyecto' });
    }

    const [proyectoRows] = await db.query(
      'SELECT * FROM proyecto_scorm WHERE id_proyecto = ?',
      [id_proyecto]
    );
    const proyecto = proyectoRows[0] || null;

    const [metadataRows] = await db.query(
      'SELECT * FROM proyecto_metadata WHERE id_proyecto = ?',
      [id_proyecto]
    );
    const metadata = metadataRows[0] || null;

    const [orgRows] = await db.query(
      'SELECT * FROM organizacion WHERE id_manifest = ?',
      [manifest.id_manifest]
    );
    if (!orgRows.length) {
      return res.status(400).json({ mensaje: 'No existen organizaciones en el manifest' });
    }

    const [itemsRows] = await db.query(
      'SELECT i.*, r.identificador AS recurso_identificador FROM item i LEFT JOIN recurso r ON i.id_recurso = r.id_recurso WHERE i.id_organizacion IN (?)',
      [orgRows.map((o) => o.id_organizacion)]
    );

    const [recursosRows] = await db.query(
      `SELECT r.*, a.nombre_fisico, a.ruta
       FROM recurso r
       INNER JOIN archivo a ON r.id_archivo = a.id_archivo
       WHERE r.id_manifest = ?`,
      [manifest.id_manifest]
    );
    if (!recursosRows.length) {
      return res.status(400).json({ mensaje: 'No existen recursos para el manifest' });
    }

    const [archivosRows] = await db.query(
      'SELECT * FROM archivo WHERE id_proyecto = ?',
      [id_proyecto]
    );

    const validationErrors = validateScormData({
      manifest,
      organizaciones: orgRows,
      items: itemsRows,
      recursos: recursosRows,
      archivos: archivosRows,
    });
    if (validationErrors.length) {
      return res.status(400).json({
        mensaje: 'Datos SCORM invalidos',
        errores: validationErrors,
      });
    }

    const manifestXml = buildManifestXml({
      manifest,
      proyecto,
      metadata,
      organizaciones: orgRows,
      items: itemsRows,
      recursos: recursosRows,
      archivos: archivosRows,
    });

    const baseDir = path.resolve(__dirname, '..');
    const uploadDir = process.env.UPLOAD_DIR || path.join(baseDir, 'uploads');
    const packageDir = process.env.PACKAGE_DIR || path.join(baseDir, 'packages');
    await fs.promises.mkdir(packageDir, { recursive: true });

    const zipName = `scorm_${id_proyecto}_${Date.now()}.zip`;
    const zipPath = path.join(packageDir, zipName);

    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', async () => {
      if (hasError || responded) {
        return;
      }
      const id_paquete = await PaqueteGenerado.crear({
        id_proyecto,
        ruta_zip: zipPath,
        version_scorm: '1.2',
        lms_destino: null,
      });

      responded = true;
      res.setHeader('X-Paquete-Id', String(id_paquete));
      return res.download(zipPath, zipName);
    });

    archive.on('error', (err) => {
      console.error('Error al generar zip:', err);
      if (responded) {
        return;
      }
      hasError = true;
      responded = true;
      return res.status(500).json({ mensaje: 'Error al generar paquete' });
    });

    archive.pipe(output);
    archive.append(manifestXml, { name: 'imsmanifest.xml' });

    const added = new Set();

    for (const recurso of recursosRows) {
      const filePath = resolveArchivoPath(recurso.ruta, uploadDir);
      const recursoPath = normalizeRelativePath(recurso.href || recurso.nombre_fisico);
      const zipPathName = recursoPath
        ? path.posix.join(CONTENT_PREFIX, recursoPath)
        : null;
      if (!filePath || !ensureFileExists(filePath) || !zipPathName) {
        hasError = true;
        archive.abort();
        output.destroy();
        await fs.promises.unlink(zipPath).catch(() => {});
        if (!responded) {
          responded = true;
          return res.status(400).json({
            mensaje: `Archivo o ruta invalida para recurso: ${recurso.identificador}`,
          });
        }
        return;
      }
      if (!added.has(zipPathName)) {
        archive.file(filePath, { name: zipPathName });
        added.add(zipPathName);
      }
    }

    for (const archivo of archivosRows) {
      const filePath = resolveArchivoPath(archivo.ruta, uploadDir);
      const archivoPath = normalizeRelativePath(archivo.ruta || archivo.nombre_fisico);
      const zipPathName = archivoPath
        ? path.posix.join(CONTENT_PREFIX, archivoPath)
        : null;
      if (!filePath || !ensureFileExists(filePath) || !zipPathName) {
        hasError = true;
        archive.abort();
        output.destroy();
        await fs.promises.unlink(zipPath).catch(() => {});
        if (!responded) {
          responded = true;
          return res.status(400).json({
            mensaje: `Archivo o ruta invalida: ${archivo.nombre_fisico}`,
          });
        }
        return;
      }
      if (!added.has(zipPathName)) {
        archive.file(filePath, { name: zipPathName });
        added.add(zipPathName);
      }
    }

    archive.finalize();
  } catch (err) {
    console.error('Error al generar paquete SCORM 1.2:', err);
    return res.status(500).json({ mensaje: 'Error al generar paquete SCORM' });
  }
};

const generarPaquete2004 = async (req, res) => {
  try {
    const { id_proyecto } = req.params;
    let responded = false;
    let hasError = false;

    const [manifestRows] = await db.query(
      'SELECT * FROM manifest WHERE id_proyecto = ?',
      [id_proyecto]
    );
    if (manifestRows.length > 1) {
      return res
        .status(400)
        .json({ mensaje: 'Existe mas de un manifest para el proyecto' });
    }
    const manifest = manifestRows[0];
    if (!manifest) {
      return res.status(400).json({ mensaje: 'No existe manifest para el proyecto' });
    }

    const [proyectoRows] = await db.query(
      'SELECT * FROM proyecto_scorm WHERE id_proyecto = ?',
      [id_proyecto]
    );
    const proyecto = proyectoRows[0] || null;

    const [metadataRows] = await db.query(
      'SELECT * FROM proyecto_metadata WHERE id_proyecto = ?',
      [id_proyecto]
    );
    const metadata = metadataRows[0] || null;

    const [orgRows] = await db.query(
      'SELECT * FROM organizacion WHERE id_manifest = ?',
      [manifest.id_manifest]
    );
    if (!orgRows.length) {
      return res.status(400).json({ mensaje: 'No existen organizaciones en el manifest' });
    }

    const [itemsRows] = await db.query(
      'SELECT i.*, r.identificador AS recurso_identificador FROM item i LEFT JOIN recurso r ON i.id_recurso = r.id_recurso WHERE i.id_organizacion IN (?)',
      [orgRows.map((o) => o.id_organizacion)]
    );

    const [recursosRows] = await db.query(
      `SELECT r.*, a.nombre_fisico, a.ruta
       FROM recurso r
       INNER JOIN archivo a ON r.id_archivo = a.id_archivo
       WHERE r.id_manifest = ?`,
      [manifest.id_manifest]
    );
    if (!recursosRows.length) {
      return res.status(400).json({ mensaje: 'No existen recursos para el manifest' });
    }

    const [archivosRows] = await db.query(
      'SELECT * FROM archivo WHERE id_proyecto = ?',
      [id_proyecto]
    );

    const validationErrors = validateScormData({
      manifest,
      organizaciones: orgRows,
      items: itemsRows,
      recursos: recursosRows,
      archivos: archivosRows,
    });
    if (validationErrors.length) {
      return res.status(400).json({
        mensaje: 'Datos SCORM invalidos',
        errores: validationErrors,
      });
    }

    const manifestXml = buildManifestXml2004({
      manifest,
      proyecto,
      metadata,
      organizaciones: orgRows,
      items: itemsRows,
      recursos: recursosRows,
      archivos: archivosRows,
    });

    const baseDir = path.resolve(__dirname, '..');
    const uploadDir = process.env.UPLOAD_DIR || path.join(baseDir, 'uploads');
    const packageDir = process.env.PACKAGE_DIR || path.join(baseDir, 'packages');
    await fs.promises.mkdir(packageDir, { recursive: true });

    const zipName = `scorm2004_${id_proyecto}_${Date.now()}.zip`;
    const zipPath = path.join(packageDir, zipName);

    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', async () => {
      if (hasError || responded) {
        return;
      }
      const id_paquete = await PaqueteGenerado.crear({
        id_proyecto,
        ruta_zip: zipPath,
        version_scorm: '2004_4th',
        lms_destino: null,
      });

      responded = true;
      res.setHeader('X-Paquete-Id', String(id_paquete));
      return res.download(zipPath, zipName);
    });

    archive.on('error', (err) => {
      console.error('Error al generar zip:', err);
      if (responded) {
        return;
      }
      hasError = true;
      responded = true;
      return res.status(500).json({ mensaje: 'Error al generar paquete' });
    });

    archive.pipe(output);
    archive.append(manifestXml, { name: 'imsmanifest.xml' });

    const added = new Set();

    for (const recurso of recursosRows) {
      const filePath = resolveArchivoPath(recurso.ruta, uploadDir);
      const recursoPath = normalizeRelativePath(recurso.href || recurso.nombre_fisico);
      const zipPathName = recursoPath
        ? path.posix.join(CONTENT_PREFIX, recursoPath)
        : null;
      if (!filePath || !ensureFileExists(filePath) || !zipPathName) {
        hasError = true;
        archive.abort();
        output.destroy();
        await fs.promises.unlink(zipPath).catch(() => {});
        if (!responded) {
          responded = true;
          return res.status(400).json({
            mensaje: `Archivo o ruta invalida para recurso: ${recurso.identificador}`,
          });
        }
        return;
      }
      if (!added.has(zipPathName)) {
        archive.file(filePath, { name: zipPathName });
        added.add(zipPathName);
      }
    }

    for (const archivo of archivosRows) {
      const filePath = resolveArchivoPath(archivo.ruta, uploadDir);
      const archivoPath = normalizeRelativePath(archivo.ruta || archivo.nombre_fisico);
      const zipPathName = archivoPath
        ? path.posix.join(CONTENT_PREFIX, archivoPath)
        : null;
      if (!filePath || !ensureFileExists(filePath) || !zipPathName) {
        hasError = true;
        archive.abort();
        output.destroy();
        await fs.promises.unlink(zipPath).catch(() => {});
        if (!responded) {
          responded = true;
          return res.status(400).json({
            mensaje: `Archivo o ruta invalida: ${archivo.nombre_fisico}`,
          });
        }
        return;
      }
      if (!added.has(zipPathName)) {
        archive.file(filePath, { name: zipPathName });
        added.add(zipPathName);
      }
    }

    archive.finalize();
  } catch (err) {
    console.error('Error al generar paquete SCORM 2004:', err);
    return res.status(500).json({ mensaje: 'Error al generar paquete SCORM' });
  }
};

module.exports = {
  validarProyecto,
  generarPaquete12,
  generarPaquete2004,
};
