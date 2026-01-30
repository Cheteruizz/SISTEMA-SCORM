// src/controllers/scorm_import.controller.js
const path = require('path');
const os = require('os');
const fs = require('fs');
const unzipper = require('unzipper');
const { pipeline } = require('stream/promises');
const { XMLParser } = require('fast-xml-parser');
const Manifest = require('../models/manifest.model');
const Organizacion = require('../models/organizacion.model');
const Item = require('../models/item.model');
const Recurso = require('../models/recurso.model');
const Archivo = require('../models/archivo.model');
const Proyecto = require('../models/proyecto.model');
const ProyectoMetadata = require('../models/proyecto_metadata.model');
const { normalizeRelativePath } = require('../services/scorm12');
const {
  validateManifestImportData,
  detectScormVersion,
} = require('../services/scorm_manifest_validator');

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  parseTagValue: false,
  parseAttributeValue: false,
});

const toArray = (value) => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

const getText = (value) => {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && value['#text']) return value['#text'];
  return '';
};

const findManifestNode = (parsed) => {
  if (!parsed || typeof parsed !== 'object') return null;
  if (parsed.manifest) return parsed.manifest;
  const key = Object.keys(parsed).find((k) => k.toLowerCase().endsWith('manifest'));
  return key ? parsed[key] : null;
};

const getAttr = (node, keys, fallback) => {
  if (!node) return fallback;
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(node, key)) {
      return node[key];
    }
  }
  return fallback;
};

const stripContentPrefix = (href) => {
  if (!href) return href;
  if (href.startsWith('content/')) return href.slice('content/'.length);
  if (href.startsWith('content\\')) return href.slice('content\\'.length);
  return href;
};

const buildArchivoIndex = (archivos) => {
  const map = new Map();
  archivos.forEach((archivo) => {
    if (archivo.nombre_original) map.set(archivo.nombre_original, archivo.id_archivo);
    if (archivo.nombre_fisico) map.set(archivo.nombre_fisico, archivo.id_archivo);
    if (archivo.ruta) map.set(archivo.ruta, archivo.id_archivo);
  });
  return map;
};

const resolveArchivoId = (href, archivoMap, archivoIndex) => {
  if (!href) return null;
  const base = path.basename(href);
  const direct = archivoMap[href] || archivoMap[base];
  if (direct) return Number(direct);
  return archivoIndex.get(href) || archivoIndex.get(base) || null;
};

const parseManifest = (xml) => {
  const parsed = parser.parse(xml);
  const manifestNode = findManifestNode(parsed);
  if (!manifestNode) {
    return { errors: ['No se encontro nodo manifest en el XML'], data: null };
  }

  const metadataNode = manifestNode.metadata || {};
  const schemaValue = getText(metadataNode.schema);
  const schemaversionValue = getText(metadataNode.schemaversion);

  const manifest = {
    identificador: manifestNode.identifier || manifestNode.id || 'MANIFEST',
    version: manifestNode.version || null,
  };

  const organizationsNode = manifestNode.organizations || {};
  const defaultOrg = organizationsNode.default || null;
  const organizations = toArray(organizationsNode.organization).map((org) => ({
    identificador: org.identifier || 'ORG',
    titulo: getText(org.title) || 'Organizacion',
    es_principal: defaultOrg ? org.identifier === defaultOrg : false,
    items: toArray(org.item),
  }));

  const resourcesNode = manifestNode.resources || {};
  const resources = toArray(resourcesNode.resource).map((res) => ({
    identificador: res.identifier || 'RES',
    tipo_recurso: res.type || 'webcontent',
    scorm_type:
      getAttr(res, ['adlcp:scormType', 'adlcp:scormtype', 'scormType', 'scormtype'], 'sco') ||
      'sco',
    href: res.href || null,
  }));

  return {
    errors: [],
    data: {
      manifest,
      organizations,
      resources,
      metadata: {
        schema: schemaValue,
        schemaversion: schemaversionValue,
      },
    },
  };
};

const EXTENSIONES_PERMITIDAS = new Set([
  '.html',
  '.js',
  '.css',
  '.json',
  '.png',
  '.jpg',
  '.jpeg',
  '.svg',
  '.gif',
  '.mp4',
  '.webm',
  '.mp3',
  '.wav',
  '.pdf',
]);

const MIME_POR_EXTENSION = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.gif': 'image/gif',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.pdf': 'application/pdf',
};

const obtenerMime = (ruta) => {
  const ext = path.extname(ruta || '').toLowerCase();
  return MIME_POR_EXTENSION[ext] || 'application/octet-stream';
};

const importarDesdeParsed = async (id_proyecto, parsed, recursos, organizations) => {
  const id_manifest = await Manifest.crear({
    id_proyecto,
    identificador: parsed.manifest.identificador,
    version: parsed.manifest.version,
  });

  const recursoIdMap = new Map();
  for (const recurso of recursos) {
    const id_recurso = await Recurso.crear({
      id_manifest,
      id_archivo: recurso.id_archivo,
      identificador: recurso.identificador,
      href: recurso.href,
      tipo_recurso: recurso.tipo_recurso,
      scorm_type: recurso.scorm_type,
    });
    recursoIdMap.set(recurso.identificador, id_recurso);
  }

  const createItemTree = async (items, id_organizacion, id_padre = null, ordenBase = 1) => {
    let order = ordenBase;
    for (const item of items) {
      const identificador = item.identifier || `ITEM_${Date.now()}_${order}`;
      const title = getText(item.title) || 'Item';
      const identifierref = item.identifierref || null;
      const id_recurso = identifierref ? recursoIdMap.get(identifierref) || null : null;
      const tipo_item = id_recurso ? 'sco' : 'agrupador';
      const es_lanzable = Boolean(id_recurso);

      const id_item = await Item.crear({
        id_organizacion,
        id_padre,
        identificador,
        titulo: title,
        tipo_item,
        orden: order,
        es_lanzable,
        id_recurso,
      });

      const children = toArray(item.item);
      if (children.length) {
        await createItemTree(children, id_organizacion, id_item, 1);
      }

      order += 1;
    }
  };

  let principalId = null;
  for (const org of organizations) {
    const id_organizacion = await Organizacion.crear({
      id_manifest,
      identificador: org.identificador,
      titulo: org.titulo,
      es_principal: org.es_principal,
    });
    if (!principalId || org.es_principal) {
      principalId = id_organizacion;
    }
    await createItemTree(org.items, id_organizacion);
  }

  return { id_manifest, id_organizacion_principal: principalId, recursos: recursos.length };
};

const importarManifest = async (req, res) => {
  try {
    const xmlBuffer = req.file?.buffer;
    const xmlBody = req.body?.xml;
    const id_proyecto = Number(req.body?.id_proyecto);
    const dryRun = String(req.body?.dry_run || '').toLowerCase() === 'true';

    if (!id_proyecto) {
      return res.status(400).json({ mensaje: 'id_proyecto es obligatorio' });
    }

    const xml = xmlBuffer ? xmlBuffer.toString('utf8') : xmlBody;
    if (!xml) {
      return res.status(400).json({ mensaje: 'XML de manifest es obligatorio' });
    }

    const parsed = parseManifest(xml);
    if (parsed.errors.length) {
      return res.status(400).json({ mensaje: 'XML invalido', errores: parsed.errors });
    }

    const manifestValidation = validateManifestImportData(parsed.data);
    if (manifestValidation.errors.length) {
      return res.status(400).json({
        mensaje: 'Manifest invalido',
        errores: manifestValidation.errors,
        warnings: manifestValidation.warnings,
      });
    }

    const { manifest, organizations, resources } = parsed.data;
    const archivos = await Archivo.obtenerTodos({ id_proyecto });
    const archivoIndex = buildArchivoIndex(archivos);

    let archivoMap = {};
    if (req.body?.archivo_map) {
      archivoMap =
        typeof req.body.archivo_map === 'string'
          ? JSON.parse(req.body.archivo_map)
          : req.body.archivo_map;
    }

    const recursos = resources.map((recurso) => {
      const hrefRaw = stripContentPrefix(recurso.href || '');
      const href = normalizeRelativePath(hrefRaw);
      return {
        ...recurso,
        href,
        id_archivo: resolveArchivoId(href || hrefRaw, archivoMap, archivoIndex),
      };
    });

    const errores = [];
    recursos.forEach((recurso) => {
      if (!recurso.href) {
        errores.push(`Href invalido en recurso ${recurso.identificador}`);
      }
      if (!recurso.id_archivo) {
        errores.push(`No se encontro archivo para recurso ${recurso.identificador}`);
      }
    });

    if (errores.length || dryRun) {
      return res.json({
        valido: errores.length === 0,
        errores,
        warnings: manifestValidation.warnings,
        data: { manifest, organizations: organizations.map((o) => ({
          identificador: o.identificador,
          titulo: o.titulo,
          es_principal: o.es_principal,
        })), resources: recursos },
      });
    }

    const resultado = await importarDesdeParsed(
      id_proyecto,
      parsed.data,
      recursos,
      organizations,
      archivoIndex
    );
    return res.status(201).json({
      mensaje: 'Manifest importado correctamente',
      ...resultado,
    });
  } catch (err) {
    console.error('Error al importar manifest:', err);
    return res.status(500).json({ mensaje: 'Error al importar manifest' });
  }
};

const importarZip = async (req, res) => {
  let tempDir = null;
  try {
    let id_proyecto = Number(req.body?.id_proyecto);
    const crearProyecto = String(req.body?.crear_proyecto || '').toLowerCase() === 'true';
    const id_usuario = Number(req.body?.id_usuario);
    const dryRun = String(req.body?.dry_run || '').toLowerCase() === 'true';
    if (!id_proyecto && !crearProyecto) {
      return res.status(400).json({ mensaje: 'id_proyecto es obligatorio' });
    }
    if (crearProyecto && !id_usuario) {
      return res.status(400).json({ mensaje: 'id_usuario es obligatorio para crear proyecto' });
    }
    if (!req.file?.buffer) {
      return res.status(400).json({ mensaje: 'Archivo ZIP es obligatorio' });
    }

    const zip = await unzipper.Open.buffer(req.file.buffer);
    const entries = zip.files || [];
    const errores = [];
    const warnings = [];
    let totalBytes = 0;
    let fileCount = 0;
    let manifestEntry = null;
    const zipFiles = [];
    const zipSet = new Set();

    entries.forEach((entry) => {
      const entryPath = String(entry.path || '').replace(/\\/g, '/');
      if (entry.type === 'Directory') return;
      if (path.basename(entryPath).toLowerCase() === 'imsmanifest.xml') {
        if (entryPath.toLowerCase() !== 'imsmanifest.xml') {
          errores.push('imsmanifest.xml debe estar en la raiz del ZIP');
          return;
        }
        manifestEntry = entry;
        return;
      }
      const rel = stripContentPrefix(entryPath);
      const normalized = normalizeRelativePath(rel);
      if (!normalized) {
        errores.push(`Ruta invalida en ZIP: ${entryPath}`);
        return;
      }
      const ext = path.extname(normalized).toLowerCase();
      if (!EXTENSIONES_PERMITIDAS.has(ext)) {
        errores.push(`Extension no permitida: ${entryPath}`);
        return;
      }
      fileCount += 1;
      totalBytes += Number(entry.uncompressedSize || 0);
      zipFiles.push({ entry, relPath: normalized, originalPath: entryPath });
      zipSet.add(normalized);
      zipSet.add(path.basename(normalized));
    });

    if (!manifestEntry) {
      errores.push('No se encontro imsmanifest.xml en el ZIP');
    }
    if (fileCount > 500) {
      errores.push('El ZIP supera el limite de 500 archivos');
    }
    if (totalBytes > 200 * 1024 * 1024) {
      errores.push('El ZIP supera el limite de 200MB');
    }

    if (errores.length) {
      return res.status(400).json({ valido: false, errores });
    }

    const manifestXml = manifestEntry
      ? (await manifestEntry.buffer()).toString('utf8')
      : '';
    const parsed = parseManifest(manifestXml);
    if (parsed.errors.length) {
      return res.status(400).json({ valido: false, errores: parsed.errors });
    }

    const validation = validateManifestImportData(parsed.data);
    if (validation.errors.length) {
      return res.status(400).json({
        valido: false,
        errores: validation.errors,
        warnings: validation.warnings,
      });
    }

    if (crearProyecto && !dryRun) {
      const titulo =
        req.body?.titulo ||
        parsed.data.organizations?.[0]?.titulo ||
        parsed.data.manifest?.identificador ||
        'Proyecto importado';
      const descripcion = req.body?.descripcion || null;
      const detectedVersion = detectScormVersion(parsed.data.metadata) || null;
      const version_scorm = req.body?.version_scorm || detectedVersion || '1.2';

      id_proyecto = await Proyecto.crear({
        id_usuario,
        titulo,
        descripcion,
        version_scorm,
        estado: 'en_edicion',
      });

      await ProyectoMetadata.crear({
        id_proyecto,
        idioma: 'es',
        descripcion_detallada: descripcion || null,
      });
    }

    if (!id_proyecto) {
      return res.status(400).json({ mensaje: 'id_proyecto invalido' });
    }

    const recursosPre = parsed.data.resources.map((recurso) => {
      const hrefRaw = stripContentPrefix(recurso.href || '');
      const href = normalizeRelativePath(hrefRaw);
      return {
        ...recurso,
        href,
      };
    });

    const erroresPre = [];
    recursosPre.forEach((recurso) => {
      if (!recurso.href) {
        erroresPre.push(`Href invalido en recurso ${recurso.identificador}`);
      }
      if (recurso.href && !zipSet.has(recurso.href) && !zipSet.has(path.basename(recurso.href))) {
        erroresPre.push(`Recurso no encontrado en ZIP: ${recurso.identificador}`);
      }
    });

    if (erroresPre.length && !dryRun) {
      return res.status(400).json({ valido: false, errores: erroresPre });
    }

    const archivoIndex = buildArchivoIndex(await Archivo.obtenerTodos({ id_proyecto }));
    const archivoMap = {};

    if (dryRun) {
      zipFiles.forEach((file) => {
        archivoMap[file.relPath] = 1;
        archivoMap[path.basename(file.relPath)] = 1;
      });
    } else {
      const baseDir = path.resolve(__dirname, '..');
      const uploadDir = process.env.UPLOAD_DIR || path.join(baseDir, 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'scormzip-'));

      for (const file of zipFiles) {
        const destPath = path.resolve(uploadDir, file.relPath);
        if (!destPath.startsWith(path.resolve(uploadDir) + path.sep)) {
          errores.push(`Ruta invalida en ZIP: ${file.originalPath}`);
          continue;
        }
        await fs.promises.mkdir(path.dirname(destPath), { recursive: true });
        await pipeline(file.entry.stream(), fs.createWriteStream(destPath));

        const id_archivo = await Archivo.crear({
          id_proyecto,
          id_leccion: null,
          nombre_original: path.basename(file.relPath),
          nombre_fisico: file.relPath,
          tipo_mime: obtenerMime(file.relPath),
          tamano_bytes: Number(file.entry.uncompressedSize || 0),
          ruta: file.relPath,
        });

        archivoMap[file.relPath] = id_archivo;
        archivoMap[path.basename(file.relPath)] = id_archivo;
      }
    }

    const recursos = recursosPre.map((recurso) => ({
      ...recurso,
      id_archivo: resolveArchivoId(recurso.href, archivoMap, archivoIndex),
    }));

    const erroresRecursos = [];
    erroresRecursos.push(...erroresPre);
    recursos.forEach((recurso) => {
      if (!recurso.id_archivo) {
        erroresRecursos.push(`No se encontro archivo para recurso ${recurso.identificador}`);
      }
    });

    if (erroresRecursos.length || dryRun) {
      return res.json({
        valido: erroresRecursos.length === 0,
        errores: erroresRecursos,
        warnings,
        data: {
          manifest: parsed.data.manifest,
          organizations: parsed.data.organizations.map((o) => ({
            identificador: o.identificador,
            titulo: o.titulo,
            es_principal: o.es_principal,
          })),
          resources: recursos,
          metadata: parsed.data.metadata,
        },
      });
    }

    const resultado = await importarDesdeParsed(id_proyecto, parsed.data, recursos, parsed.data.organizations);

    return res.status(201).json({
      mensaje: 'ZIP importado correctamente',
      id_proyecto,
      ...resultado,
    });
  } catch (err) {
    console.error('Error al importar ZIP:', err);
    return res.status(500).json({ mensaje: 'Error al importar ZIP' });
  } finally {
    if (tempDir) {
      fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
  }
};

module.exports = {
  importarManifest,
  importarZip,
};
