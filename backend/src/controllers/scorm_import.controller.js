// src/controllers/scorm_import.controller.js
const path = require('path');
const fs = require('fs');
const unzipper = require('unzipper');
const { XMLParser } = require('fast-xml-parser');
const db = require('../db');
const { normalizeRelativePath } = require('../services/scorm12');
const {
  validateManifestImportData,
  detectScormVersion,
} = require('../services/scorm_manifest_validator');

const MAX_ARCHIVOS_PROYECTO = Number.parseInt(
  process.env.MAX_ARCHIVOS_PROYECTO || '2000',
  10
);
const MAX_TOTAL_BYTES = Number.parseInt(
  process.env.MAX_TOTAL_BYTES || String(2 * 1024 * 1024 * 1024),
  10
);

const ensureArray = (value) => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

const readText = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    if (typeof value['#text'] === 'string') return value['#text'];
    if (typeof value['#text'] === 'number') return String(value['#text']);
    if (typeof value['@_value'] === 'string') return value['@_value'];
    if (typeof value['@_value'] === 'number') return String(value['@_value']);
    const keys = Object.keys(value);
    if (keys.length === 1) {
      return readText(value[keys[0]]);
    }
  }
  return '';
};

const guessMime = (filename) => {
  const ext = path.extname(filename || '').toLowerCase();
  switch (ext) {
    case '.html':
    case '.htm':
      return 'text/html';
    case '.js':
      return 'application/javascript';
    case '.css':
      return 'text/css';
    case '.json':
      return 'application/json';
    case '.xml':
    case '.xsd':
      return 'application/xml';
    case '.txt':
    case '.csv':
      return 'text/plain';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.gif':
      return 'image/gif';
    case '.svg':
      return 'image/svg+xml';
    case '.webp':
      return 'image/webp';
    case '.ico':
      return 'image/x-icon';
    case '.mp4':
      return 'video/mp4';
    case '.webm':
      return 'video/webm';
    case '.mp3':
      return 'audio/mpeg';
    case '.wav':
      return 'audio/wav';
    case '.pdf':
      return 'application/pdf';
    case '.woff':
      return 'font/woff';
    case '.woff2':
      return 'font/woff2';
    case '.ttf':
      return 'font/ttf';
    case '.otf':
      return 'font/otf';
    default:
      return 'application/octet-stream';
  }
};

const parseManifest = (xmlText) => {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    removeNSPrefix: true,
    trimValues: true,
    parseTagValue: true,
  });
  const parsed = parser.parse(xmlText);
  const manifest = parsed?.manifest;
  return manifest || null;
};

const getManifestMetadata = (manifest) => {
  const metadata = manifest?.metadata || {};
  const lom = metadata?.lom || metadata?.imsmd_lom || {};
  const general = lom?.general || {};
  const title = readText(general?.title?.string || general?.title || '');
  const description = readText(general?.description?.string || general?.description || '');
  const keyword = readText(general?.keyword?.string || general?.keyword || '');
  const language = readText(general?.language || '');
  const lifeCycle = lom?.lifeCycle || {};
  const contribute = ensureArray(lifeCycle?.contribute);
  let author = '';
  let publisher = '';
  contribute.forEach((entry) => {
    const role = readText(entry?.role?.value || entry?.role);
    const entity = readText(entry?.entity || '');
    if (!role) return;
    if (!author && role.toLowerCase().includes('author')) {
      author = entity;
    }
    if (!publisher && role.toLowerCase().includes('publisher')) {
      publisher = entity;
    }
  });
  return {
    schema: readText(metadata?.schema || ''),
    schemaversion: readText(metadata?.schemaversion || ''),
    title,
    description,
    keyword,
    language,
    author,
    publisher,
  };
};

const buildItemTree = (itemNode) => {
  const items = ensureArray(itemNode);
  return items.map((node) => {
    const identifier = node?.['@_identifier'] || node?.identifier || '';
    const identifierref = node?.['@_identifierref'] || node?.identifierref || '';
    const title = readText(node?.title || '');
    const children = buildItemTree(node?.item);
    return {
      identifier,
      identifierref,
      title,
      children,
    };
  });
};

const collectResourceNodes = (node, list = []) => {
  if (!node) return list;
  if (node.identifierref) {
    list.push(node);
  }
  (node.children || []).forEach((child) => collectResourceNodes(child, list));
  return list;
};

const titleFromHref = (href, fallback) => {
  if (!href) return fallback;
  const clean = String(href).split('#')[0].split('?')[0];
  const base = clean.split('/').pop();
  return base || fallback;
};

const writeEntry = async (entry, destPath) => {
  await fs.promises.mkdir(path.dirname(destPath), { recursive: true });
  return new Promise((resolve, reject) => {
    const stream = entry.stream();
    const output = fs.createWriteStream(destPath);
    stream.on('error', reject);
    output.on('error', reject);
    output.on('finish', resolve);
    stream.pipe(output);
  });
};

const importarPaquete = async (req, res) => {
  const zipFile = req.file;
  const id_usuario = Number(req.body?.id_usuario || 0);

  if (!zipFile) {
    return res.status(400).json({ mensaje: 'Archivo ZIP no enviado' });
  }
  if (!id_usuario) {
    await fs.promises.unlink(zipFile.path).catch(() => {});
    return res.status(400).json({ mensaje: 'id_usuario es obligatorio' });
  }

  const warnings = [];

  try {
    const zip = await unzipper.Open.file(zipFile.path);
    const manifestEntry = zip.files.find((f) =>
      path.posix.basename(f.path).toLowerCase() === 'imsmanifest.xml'
    );
    if (!manifestEntry) {
      return res.status(400).json({ mensaje: 'No se encontro imsmanifest.xml en el ZIP' });
    }

    const manifestDir = path.posix.dirname(manifestEntry.path);
    const manifestBase = manifestDir === '.' ? '' : manifestDir;
    const manifestBuffer = await manifestEntry.buffer();
    const manifestXml = manifestBuffer.toString('utf8');
    const manifestNode = parseManifest(manifestXml);
    if (!manifestNode) {
      return res.status(400).json({ mensaje: 'No se pudo leer el manifest' });
    }

    const metadataInfo = getManifestMetadata(manifestNode);
    const manifestId = String(manifestNode?.['@_identifier'] || 'MANIFEST_IMPORTADO');
    const manifestVersion = String(manifestNode?.['@_version'] || '1.0');

    const orgsRaw = ensureArray(manifestNode?.organizations?.organization);
    if (!orgsRaw.length) {
      return res.status(400).json({ mensaje: 'El manifest no tiene organizaciones' });
    }
    const defaultOrgId = String(manifestNode?.organizations?.['@_default'] || '');
    const orgs = orgsRaw.map((org) => ({
      identificador: String(org?.['@_identifier'] || ''),
      titulo: readText(org?.title || 'Organizacion'),
      items: buildItemTree(org?.item),
    }));

    const resourcesRaw = ensureArray(manifestNode?.resources?.resource);
    const resources = resourcesRaw.map((resNode) => {
      const identifier = String(resNode?.['@_identifier'] || '');
      const href = String(resNode?.['@_href'] || '');
      const scormType =
        resNode?.['@_adlcp:scormtype'] ||
        resNode?.['@_adlcp:scormType'] ||
        resNode?.['@_scormtype'] ||
        resNode?.['@_scormType'] ||
        '';
      const tipo = String(resNode?.['@_type'] || 'webcontent');
      const files = ensureArray(resNode?.file).map((f) =>
        String(f?.['@_href'] || '')
      );
      return {
        identificador: identifier,
        href,
        scorm_type: scormType || 'sco',
        tipo_recurso: tipo || 'webcontent',
        files,
      };
    });

    const validation = validateManifestImportData({
      manifest: { identificador: manifestId },
      organizations: orgs,
      resources,
    });
    if (validation.errors.length) {
      return res.status(400).json({
        mensaje: 'Manifest invalido',
        errores: validation.errors,
        warnings: validation.warnings,
      });
    }
    if (validation.warnings.length) {
      warnings.push(...validation.warnings);
    }

    const versionScorm = detectScormVersion(metadataInfo) || '1.2';
    const projectTitle =
      metadataInfo.title ||
      orgs.find((o) => o.identificador === defaultOrgId)?.titulo ||
      orgs[0]?.titulo ||
      'Proyecto importado';
    const projectDescription = metadataInfo.description || '';

    const baseDir = path.resolve(__dirname, '..');
    const uploadDir = process.env.UPLOAD_DIR || path.join(baseDir, 'uploads');

    const fileEntries = [];
    let totalBytes = 0;
    zip.files.forEach((entry) => {
      if (entry.type === 'Directory') return;
      const entryPath = entry.path.replace(/\\/g, '/');
      if (path.posix.basename(entryPath).toLowerCase() === 'imsmanifest.xml') {
        return;
      }
      if (manifestBase) {
        if (!entryPath.startsWith(`${manifestBase}/`)) return;
      }
      let relativePath = manifestBase
        ? entryPath.slice(manifestBase.length + 1)
        : entryPath;
      relativePath = normalizeRelativePath(relativePath);
      if (!relativePath) return;
      fileEntries.push({ entry, relativePath });
      totalBytes += Number(entry.uncompressedSize || 0);
    });

    if (fileEntries.length > MAX_ARCHIVOS_PROYECTO) {
      return res.status(400).json({
        mensaje: 'Limite de archivos por proyecto alcanzado',
      });
    }
    if (totalBytes > MAX_TOTAL_BYTES) {
      return res.status(400).json({
        mensaje: 'Limite total de almacenamiento excedido',
      });
    }

    const conn = await db.getConnection();
    let projectId = null;
    let createdOrgId = null;
    let createdManifestId = null;
    const archivosMap = new Map();
    const recursosMap = new Map();
    const importPrefix = `import_${Date.now()}`;

    try {
      await conn.beginTransaction();

      const [projectResult] = await conn.query(
        `INSERT INTO proyecto_scorm
          (id_usuario, titulo, descripcion, version_scorm, tracking_preset_default, tracking_auto_default, tracking_min_seconds_default, tracking_media_ratio_default, estado, fecha_creacion, ultima_modificacion)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NULL)`,
        [
          id_usuario,
          projectTitle,
          projectDescription,
          versionScorm,
          'auto',
          1,
          180,
          0.85,
          'importado',
        ]
      );
      projectId = projectResult.insertId;

      if (metadataInfo.title || metadataInfo.description || metadataInfo.language || metadataInfo.author || metadataInfo.publisher) {
        await conn.query(
          `INSERT INTO proyecto_metadata
            (id_proyecto, idioma, autor_principal, organizacion, entidad_publicadora, palabras_clave, nivel_dificultad, objetivo, descripcion_detallada, portada_ruta)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            projectId,
            metadataInfo.language || 'es',
            metadataInfo.author || null,
            null,
            metadataInfo.publisher || null,
            metadataInfo.keyword || null,
            null,
            null,
            metadataInfo.description || null,
            null,
          ]
        );
      }

      const [manifestResult] = await conn.query(
        `INSERT INTO manifest
          (id_proyecto, identificador, version, xmlns, schema_def, schema_version, fecha_generacion)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [
          projectId,
          manifestId,
          manifestVersion,
          null,
          metadataInfo.schema || null,
          metadataInfo.schemaversion || null,
        ]
      );
      const id_manifest = manifestResult.insertId;
      createdManifestId = id_manifest;

      const orgIdMap = new Map();
      for (const org of orgs) {
        const isDefault = defaultOrgId
          ? org.identificador === defaultOrgId
          : org === orgs[0];
        const [orgResult] = await conn.query(
          `INSERT INTO organizacion
            (id_manifest, identificador, titulo, es_principal)
           VALUES (?, ?, ?, ?)`,
          [id_manifest, org.identificador, org.titulo || 'Organizacion', isDefault ? 1 : 0]
        );
        orgIdMap.set(org.identificador, orgResult.insertId);
        if (isDefault || !createdOrgId) {
          createdOrgId = orgResult.insertId;
        }
      }

      for (const { entry, relativePath } of fileEntries) {
        const storedRelative = path.posix.join(importPrefix, relativePath);
        const destPath = path.join(uploadDir, storedRelative);
        await writeEntry(entry, destPath);
        const nombreOriginal = relativePath;
        const nombreFisico = storedRelative;
        const tipoMime = guessMime(relativePath);
        const tamanoBytes = Number(entry.uncompressedSize || 0);
        const [archivoResult] = await conn.query(
          `INSERT INTO archivo
            (id_proyecto, id_leccion, nombre_original, nombre_fisico, tipo_mime, tamano_bytes, ruta, fecha_subida)
           VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            projectId,
            null,
            nombreOriginal,
            nombreFisico,
            tipoMime,
            tamanoBytes || null,
            storedRelative,
          ]
        );
        archivosMap.set(relativePath.toLowerCase(), {
          id_archivo: archivoResult.insertId,
          storedRelative,
        });
      }

      for (const recurso of resources) {
        let href = normalizeRelativePath(recurso.href);
        if (!href && recurso.files?.length) {
          href = normalizeRelativePath(recurso.files[0]);
        }
        if (!href) {
          warnings.push(`Recurso sin href: ${recurso.identificador}`);
          continue;
        }
        const archivoInfo = archivosMap.get(href.toLowerCase());
        if (!archivoInfo) {
          warnings.push(`Archivo no encontrado para recurso ${recurso.identificador}: ${href}`);
          continue;
        }
        const [recursoResult] = await conn.query(
          `INSERT INTO recurso
            (id_manifest, id_archivo, identificador, href, tipo_recurso, scorm_type, parametros)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            id_manifest,
            archivoInfo.id_archivo,
            recurso.identificador,
            archivoInfo.storedRelative,
            recurso.tipo_recurso || 'webcontent',
            recurso.scorm_type || 'sco',
            null,
          ]
        );
        recursosMap.set(recurso.identificador, recursoResult.insertId);
      }

      const defaultOrg = orgs.find((o) => o.identificador === defaultOrgId) || orgs[0];
      for (const org of orgs) {
        const orgId = orgIdMap.get(org.identificador);
        if (!orgId) continue;
        const isDefault = defaultOrg && org.identificador === defaultOrg.identificador;

        if (!isDefault) {
          const createTree = async (nodes, parentId) => {
            let order = 1;
            for (const node of nodes) {
              const resourceId = node.identifierref ? recursosMap.get(node.identifierref) : null;
              const tipo = node.identifierref ? 'sco' : 'carpeta';
              const [itemResult] = await conn.query(
                `INSERT INTO item
                  (id_organizacion, id_padre, identificador, titulo, tipo_item, orden, es_lanzable, id_modulo, id_leccion, id_recurso, sequencing_xml, navigation_xml)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  orgId,
                  parentId || null,
                  node.identifier || `ITEM_${Date.now()}`,
                  node.title || node.identifier || 'Item',
                  tipo,
                  order,
                  resourceId ? 1 : 0,
                  null,
                  null,
                  resourceId || null,
                  null,
                  null,
                ]
              );
              const createdId = itemResult.insertId;
              if (node.children?.length) {
                await createTree(node.children, createdId);
              }
              order += 1;
            }
          };
          await createTree(org.items || [], null);
          continue;
        }

        const resourceFallbackNodes = resources
          .filter((res) => res.identificador)
          .map((res, index) => ({
            identifier: `ITEM_${res.identificador || index + 1}`,
            identifierref: res.identificador,
            title: titleFromHref(res.href, res.identificador || `Recurso ${index + 1}`),
            children: [],
          }));
        const fallbackModule =
          resourceFallbackNodes.length > 0
            ? [
                {
                  identifier: `MOD_${projectId}`,
                  title: projectTitle || 'Modulo importado',
                  children: [
                    {
                      identifier: `LEC_${projectId}`,
                      title: 'Leccion 1',
                      children: resourceFallbackNodes,
                    },
                  ],
                },
              ]
            : [];

        const moduleNodes =
          org.items && org.items.length
            ? org.items
            : fallbackModule.length
              ? fallbackModule
              : [
                  {
                    identifier: `MOD_${projectId}`,
                    title: projectTitle || 'Modulo importado',
                    children: [],
                  },
                ];

        let moduleOrder = 1;
        for (const moduloNode of moduleNodes) {
          const [modResult] = await conn.query(
            `INSERT INTO modulo
              (id_proyecto, nombre_modulo, descripcion, duracion_minutos, codigo_modulo)
             VALUES (?, ?, ?, ?, ?)`,
            [
              projectId,
              moduloNode.title || moduloNode.identifier || 'Modulo',
              null,
              null,
              moduloNode.identifier || null,
            ]
          );
          const id_modulo = modResult.insertId;
          const [modItemResult] = await conn.query(
            `INSERT INTO item
              (id_organizacion, id_padre, identificador, titulo, tipo_item, orden, es_lanzable, id_modulo, id_leccion, id_recurso, sequencing_xml, navigation_xml)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              orgId,
              null,
              moduloNode.identifier || `MOD_${id_modulo}`,
              moduloNode.title || moduloNode.identifier || 'Modulo',
              'modulo',
              moduleOrder,
              0,
              id_modulo,
              null,
              null,
              null,
              null,
            ]
          );
          const moduloItemId = modItemResult.insertId;

          const children = moduloNode.children || [];
          if (!children.length) {
            const [lecResult] = await conn.query(
              `INSERT INTO leccion
                (id_modulo, nombre_leccion, tipo_leccion, descripcion, duracion_minutos, codigo_leccion)
               VALUES (?, ?, ?, ?, ?, ?)`,
              [
                id_modulo,
                moduloNode.title || 'Leccion',
                'contenido',
                null,
                null,
                moduloNode.identifier || null,
              ]
            );
            const id_leccion = lecResult.insertId;
            const [lecItemResult] = await conn.query(
              `INSERT INTO item
                (id_organizacion, id_padre, identificador, titulo, tipo_item, orden, es_lanzable, id_modulo, id_leccion, id_recurso, sequencing_xml, navigation_xml)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                orgId,
                moduloItemId,
                `LEC_${id_leccion}`,
                moduloNode.title || 'Leccion',
                'leccion',
                1,
                0,
                id_modulo,
                id_leccion,
                null,
                null,
                null,
              ]
            );
            const leccionItemId = lecItemResult.insertId;
            const scoNodes = collectResourceNodes(moduloNode);
            let scoOrder = 1;
            for (const scoNode of scoNodes) {
              const resourceId = recursosMap.get(scoNode.identifierref);
              if (!resourceId) {
                warnings.push(`Recurso no encontrado para item ${scoNode.identifier || scoNode.title}`);
                continue;
              }
              await conn.query(
                `INSERT INTO item
                  (id_organizacion, id_padre, identificador, titulo, tipo_item, orden, es_lanzable, id_modulo, id_leccion, id_recurso, sequencing_xml, navigation_xml)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  orgId,
                  leccionItemId,
                  scoNode.identifier || `SCO_${resourceId}`,
                  scoNode.title || scoNode.identifier || 'Contenido',
                  'sco',
                  scoOrder,
                  1,
                  null,
                  id_leccion,
                  resourceId,
                  null,
                  null,
                ]
              );
              scoOrder += 1;
            }
          } else {
            let lessonOrder = 1;
            for (const leccionNode of children) {
              const [lecResult] = await conn.query(
                `INSERT INTO leccion
                  (id_modulo, nombre_leccion, tipo_leccion, descripcion, duracion_minutos, codigo_leccion)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [
                  id_modulo,
                  leccionNode.title || leccionNode.identifier || 'Leccion',
                  'contenido',
                  null,
                  null,
                  leccionNode.identifier || null,
                ]
              );
              const id_leccion = lecResult.insertId;
              const [lecItemResult] = await conn.query(
                `INSERT INTO item
                  (id_organizacion, id_padre, identificador, titulo, tipo_item, orden, es_lanzable, id_modulo, id_leccion, id_recurso, sequencing_xml, navigation_xml)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  orgId,
                  moduloItemId,
                  leccionNode.identifier || `LEC_${id_leccion}`,
                  leccionNode.title || leccionNode.identifier || 'Leccion',
                  'leccion',
                  lessonOrder,
                  0,
                  id_modulo,
                  id_leccion,
                  null,
                  null,
                  null,
                ]
              );
              const leccionItemId = lecItemResult.insertId;
              const scoNodes = collectResourceNodes(leccionNode);
              let scoOrder = 1;
              for (const scoNode of scoNodes) {
                const resourceId = recursosMap.get(scoNode.identifierref);
                if (!resourceId) {
                  warnings.push(`Recurso no encontrado para item ${scoNode.identifier || scoNode.title}`);
                  continue;
                }
                await conn.query(
                  `INSERT INTO item
                    (id_organizacion, id_padre, identificador, titulo, tipo_item, orden, es_lanzable, id_modulo, id_leccion, id_recurso, sequencing_xml, navigation_xml)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                  [
                    orgId,
                    leccionItemId,
                    scoNode.identifier || `SCO_${resourceId}`,
                    scoNode.title || scoNode.identifier || 'Contenido',
                    'sco',
                    scoOrder,
                    1,
                    null,
                    id_leccion,
                    resourceId,
                    null,
                    null,
                  ]
                );
                scoOrder += 1;
              }
              lessonOrder += 1;
            }
          }
          moduleOrder += 1;
        }
      }

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      if (projectId) {
        const importDir = path.join(uploadDir, importPrefix);
        await fs.promises.rm(importDir, { recursive: true, force: true }).catch(() => {});
      }
      throw err;
    } finally {
      conn.release();
    }

    return res.status(201).json({
      mensaje: 'Paquete importado correctamente',
      id_proyecto: projectId,
      id_manifest: createdManifestId,
      id_organizacion: createdOrgId,
      version_scorm: versionScorm,
      warnings,
    });
  } catch (err) {
    console.error('Error al importar paquete:', err);
    return res.status(500).json({ mensaje: 'Error al importar paquete' });
  } finally {
    await fs.promises.unlink(zipFile.path).catch(() => {});
  }
};

module.exports = {
  importarPaquete,
};
