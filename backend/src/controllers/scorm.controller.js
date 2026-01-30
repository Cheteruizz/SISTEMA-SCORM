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
const WRAPPER_DIR = '_wrappers';

const sanitizeFilename = (value) => {
  const base = String(value || '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);
  return base || 'recurso';
};

const escapeHtml = (value) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const buildScoWrapperHtml = ({ title, entryPath }) => {
  const safeTitle = escapeHtml(title || 'Contenido');
  const entryLiteral = JSON.stringify(entryPath || '');
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${safeTitle}</title>
    <style>
      * { box-sizing: border-box; }
      body { margin: 0; font-family: "Segoe UI", Arial, sans-serif; background: #f5f7fb; color: #1f2937; }
      header { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; background: #111827; color: #f9fafb; }
      header h1 { font-size: 16px; margin: 0; font-weight: 600; }
      header button { background: #10b981; color: #0b1a12; border: none; padding: 8px 14px; border-radius: 999px; font-weight: 600; cursor: pointer; }
      header button:disabled { opacity: 0.6; cursor: not-allowed; }
      .frame-wrap { padding: 18px; }
      iframe { width: 100%; height: calc(100vh - 96px); border: none; border-radius: 16px; background: #fff; box-shadow: 0 18px 40px rgba(15, 23, 42, 0.12); }
      .status { font-size: 12px; color: #94a3b8; }
    </style>
  </head>
  <body>
    <header>
      <div>
        <h1>${safeTitle}</h1>
        <div class="status" id="scorm-status">SCORM no inicializado</div>
      </div>
      <button id="scorm-complete">Finalizar</button>
    </header>
    <div class="frame-wrap">
      <iframe id="scorm-frame" title="${safeTitle}" loading="lazy"></iframe>
    </div>
    <script>
      (function () {
        var entrySrc = ${entryLiteral};
        var iframe = document.getElementById('scorm-frame');
        iframe.src = entrySrc;

        function findApi(win) {
          var max = 7;
          while (win && max > 0) {
            if (win.API_1484_11) return { api: win.API_1484_11, is2004: true };
            if (win.API) return { api: win.API, is2004: false };
            if (win.parent && win.parent !== win) {
              win = win.parent;
            } else {
              break;
            }
            max--;
          }
          return { api: null, is2004: false };
        }

        function createProxy(api) {
          if (!api) return null;
          return {
            LMSInitialize: function (arg) { return api.LMSInitialize ? api.LMSInitialize(arg) : 'false'; },
            LMSGetValue: function (key) { return api.LMSGetValue ? api.LMSGetValue(key) : ''; },
            LMSSetValue: function (key, value) { return api.LMSSetValue ? api.LMSSetValue(key, value) : 'false'; },
            LMSCommit: function (arg) { return api.LMSCommit ? api.LMSCommit(arg) : 'false'; },
            LMSFinish: function (arg) { return api.LMSFinish ? api.LMSFinish(arg) : 'false'; },
            LMSGetLastError: function () { return api.LMSGetLastError ? api.LMSGetLastError() : '0'; },
            LMSGetErrorString: function (code) { return api.LMSGetErrorString ? api.LMSGetErrorString(code) : ''; },
            LMSGetDiagnostic: function (code) { return api.LMSGetDiagnostic ? api.LMSGetDiagnostic(code) : ''; },
            Initialize: function (arg) { return api.Initialize ? api.Initialize(arg) : 'false'; },
            GetValue: function (key) { return api.GetValue ? api.GetValue(key) : ''; },
            SetValue: function (key, value) { return api.SetValue ? api.SetValue(key, value) : 'false'; },
            Commit: function (arg) { return api.Commit ? api.Commit(arg) : 'false'; },
            Terminate: function (arg) { return api.Terminate ? api.Terminate(arg) : 'false'; },
            GetLastError: function () { return api.GetLastError ? api.GetLastError() : '0'; },
            GetErrorString: function (code) { return api.GetErrorString ? api.GetErrorString(code) : ''; },
            GetDiagnostic: function (code) { return api.GetDiagnostic ? api.GetDiagnostic(code) : ''; },
          };
        }

        function formatScorm12Time(totalSeconds) {
          var safe = Math.max(0, Math.floor(totalSeconds || 0));
          var hours = String(Math.floor(safe / 3600)).padStart(2, '0');
          var minutes = String(Math.floor((safe % 3600) / 60)).padStart(2, '0');
          var seconds = String(safe % 60).padStart(2, '0');
          return hours + ':' + minutes + ':' + seconds;
        }

        function formatScorm2004Duration(totalSeconds) {
          var safe = Math.max(0, Math.floor(totalSeconds || 0));
          if (!safe) return 'PT0S';
          var hours = Math.floor(safe / 3600);
          var minutes = Math.floor((safe % 3600) / 60);
          var seconds = safe % 60;
          var value = 'PT';
          if (hours) value += hours + 'H';
          if (minutes) value += minutes + 'M';
          if (seconds || (!hours && !minutes)) value += seconds + 'S';
          return value;
        }

        var apiInfo = findApi(window);
        var api = apiInfo.api;
        var is2004 = apiInfo.is2004;
        var start = Date.now();
        var statusEl = document.getElementById('scorm-status');
        var finishBtn = document.getElementById('scorm-complete');

        function setStatus(text) {
          if (statusEl) statusEl.textContent = text;
        }

        function setSessionTime() {
          var seconds = Math.floor((Date.now() - start) / 1000);
          if (!api) return;
          if (is2004) {
            api.SetValue('cmi.session_time', formatScorm2004Duration(seconds));
          } else {
            api.LMSSetValue('cmi.core.session_time', formatScorm12Time(seconds));
          }
        }

        function commit() {
          if (!api) return;
          setSessionTime();
          if (is2004) {
            api.SetValue('cmi.completion_status', 'completed');
            api.Commit('');
          } else {
            api.LMSSetValue('cmi.core.lesson_status', 'completed');
            api.LMSCommit('');
          }
        }

        function finish() {
          if (!api) return;
          setSessionTime();
          if (is2004) {
            api.SetValue('cmi.completion_status', 'completed');
            api.Commit('');
            api.Terminate('');
          } else {
            api.LMSSetValue('cmi.core.lesson_status', 'completed');
            api.LMSCommit('');
            api.LMSFinish('');
          }
          setStatus('Sesion finalizada');
          finishBtn.disabled = true;
        }

        if (api) {
          var proxy = createProxy(api);
          if (proxy) {
            window.API = proxy;
            window.API_1484_11 = proxy;
          }
          if (is2004) {
            api.Initialize('');
          } else {
            api.LMSInitialize('');
          }
          setStatus('SCORM inicializado');
        } else {
          setStatus('API SCORM no encontrada');
          finishBtn.disabled = true;
        }

        finishBtn.addEventListener('click', finish);
        setInterval(commit, 30000);
        window.addEventListener('beforeunload', function () {
          commit();
        });
        document.addEventListener('visibilitychange', function () {
          if (document.visibilityState === 'hidden') {
            commit();
          }
        });
      })();
    </script>
  </body>
</html>`;
};

const buildScoWrapper = (recurso) => {
  const originalHref = normalizeRelativePath(recurso.href || recurso.nombre_fisico);
  if (!originalHref) return null;
  const baseName = sanitizeFilename(
    recurso.identificador || path.basename(originalHref, path.extname(originalHref))
  );
  const uniqueSuffix = recurso.id_recurso ? `_${recurso.id_recurso}` : '';
  const wrapperRel = path.posix.join(WRAPPER_DIR, `${baseName}${uniqueSuffix}.html`);
  const relativeEntry = path.posix.relative(path.posix.dirname(wrapperRel), originalHref);
  const html = buildScoWrapperHtml({
    title: recurso.titulo || recurso.identificador || 'Contenido',
    entryPath: relativeEntry,
  });
  return { wrapperRel, html, originalHref };
};

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
      if (!metadata.idioma) {
        warnings.push('Metadata sin idioma');
      }
    }
    if (!proyecto || !proyecto.titulo) {
      warnings.push('Proyecto sin titulo');
    }

    const runtimeWarnings = [];
    for (const recurso of recursosRows) {
      const scormType = (recurso.scorm_type || 'sco').toLowerCase();
      if (scormType !== 'sco') continue;
      const filePath = resolveArchivoPath(recurso.ruta, uploadDir);
      if (!filePath || !ensureFileExists(filePath)) continue;
      const ext = path.extname(filePath).toLowerCase();
      if (!['.html', '.htm', '.js'].includes(ext)) continue;
      const contenido = await fs.promises.readFile(filePath, 'utf8').catch(() => '');
      if (!contenido) continue;
      const has12 = /LMSInitialize\s*\(/.test(contenido);
      const has2004 = /[^a-zA-Z]Initialize\s*\(/.test(contenido);
      if (has12 && has2004) {
        runtimeWarnings.push(`SCO mezcla APIs 1.2 y 2004: ${recurso.identificador}`);
      }
      if (!has12 && !has2004) {
        runtimeWarnings.push(`SCO sin llamadas SCORM detectadas: ${recurso.identificador}`);
      }
    }

    const allErrors = [...errores, ...resourceErrors];
    return res.json({
      valido: allErrors.length === 0,
      errores: allErrors,
      warnings: [...warnings, ...runtimeWarnings],
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

    const wrapperFiles = [];
    const recursosForManifest = recursosRows.map((recurso) => {
      const scormType = (recurso.scorm_type || 'sco').toLowerCase();
      if (scormType !== 'sco') return recurso;
      const wrapper = buildScoWrapper(recurso);
      if (!wrapper) return recurso;
      wrapperFiles.push(wrapper);
      return {
        ...recurso,
        href: wrapper.wrapperRel,
        extra_files: [wrapper.originalHref],
      };
    });

    const manifestXml = buildManifestXml({
      manifest,
      proyecto,
      metadata,
      organizaciones: orgRows,
      items: itemsRows,
      recursos: recursosForManifest,
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

    for (const wrapper of wrapperFiles) {
      const zipPathName = path.posix.join(CONTENT_PREFIX, wrapper.wrapperRel);
      if (!added.has(zipPathName)) {
        archive.append(wrapper.html, { name: zipPathName });
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

    const wrapperFiles = [];
    const recursosForManifest = recursosRows.map((recurso) => {
      const scormType = (recurso.scorm_type || 'sco').toLowerCase();
      if (scormType !== 'sco') return recurso;
      const wrapper = buildScoWrapper(recurso);
      if (!wrapper) return recurso;
      wrapperFiles.push(wrapper);
      return {
        ...recurso,
        href: wrapper.wrapperRel,
        extra_files: [wrapper.originalHref],
      };
    });

    const manifestXml = buildManifestXml2004({
      manifest,
      proyecto,
      metadata,
      organizaciones: orgRows,
      items: itemsRows,
      recursos: recursosForManifest,
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

    for (const wrapper of wrapperFiles) {
      const zipPathName = path.posix.join(CONTENT_PREFIX, wrapper.wrapperRel);
      if (!added.has(zipPathName)) {
        archive.append(wrapper.html, { name: zipPathName });
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
