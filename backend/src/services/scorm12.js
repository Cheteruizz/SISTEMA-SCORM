// src/services/scorm12.js
const path = require('path');
const fs = require('fs');

const normalizeRelativePath = (value) => {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw)) return null;
  if (/^[\\/]/.test(raw)) return null;
  if (/^[a-zA-Z]:[\\/]/.test(raw)) return null;
  let normalized = raw.replace(/\\/g, '/');
  normalized = normalized.replace(/^\.\/+/, '');
  while (normalized.startsWith('uploads/')) {
    normalized = normalized.slice('uploads/'.length);
  }
  const segments = normalized.split('/');
  if (segments.some((segment) => segment === '..' || segment === '')) {
    return null;
  }
  return normalized;
};

const escapeXml = (value) => {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

const CONTENT_PREFIX = 'content/';

const withContentPrefix = (value) => {
  if (!value) return value;
  return `${CONTENT_PREFIX}${value}`;
};

const buildItemTree = (items) => {
  const map = new Map();
  const roots = [];

  items.forEach((item) => {
    map.set(item.id_item, { ...item, children: [] });
  });

  items.forEach((item) => {
    const node = map.get(item.id_item);
    if (item.id_padre && map.has(item.id_padre)) {
      map.get(item.id_padre).children.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortTree = (nodes) => {
    nodes.sort((a, b) => (a.orden || 0) - (b.orden || 0));
    nodes.forEach((node) => sortTree(node.children));
  };

  sortTree(roots);
  return roots;
};

const buildItemXml = (node) => {
  const identifier = escapeXml(node.identificador);
  const title = escapeXml(node.titulo);
  const isVisible = node.es_lanzable ? 'true' : 'false';
  const identifierref =
    node.id_recurso && node.recurso_identificador
      ? ` identifierref="${escapeXml(node.recurso_identificador)}"`
      : '';

  const childrenXml = (node.children || []).map(buildItemXml).join('');
  return `<item identifier="${identifier}"${identifierref} isvisible="${isVisible}"><title>${title}</title>${childrenXml}</item>`;
};

const buildResourcesXml = (recursos, archivos = [], options = {}) => {
  const prefixContent = Boolean(options.prefixContent);
  const scormTypeAttribute = options.scormTypeAttribute || 'adlcp:scormtype';
  const archivosNormalized = archivos
    .map((archivo) => normalizeRelativePath(archivo.ruta || archivo.nombre_fisico))
    .filter(Boolean);

  return recursos
    .map((recurso) => {
      const identifier = escapeXml(recurso.identificador);
      const hrefRaw = normalizeRelativePath(recurso.href || recurso.nombre_fisico);
      const href = escapeXml(prefixContent ? withContentPrefix(hrefRaw) : hrefRaw);
      const tipo = escapeXml(recurso.tipo_recurso || 'webcontent');
      const scormType = escapeXml(recurso.scorm_type || 'sco');
      const archivoBase = hrefRaw || normalizeRelativePath(recurso.nombre_fisico);
      const archivoHref = href || escapeXml(prefixContent ? withContentPrefix(archivoBase) : archivoBase);
      const files = new Set();

      if (hrefRaw) {
        files.add(prefixContent ? withContentPrefix(hrefRaw) : hrefRaw);
        const lastSlash = hrefRaw.lastIndexOf('/');
        if (lastSlash > 0) {
          const baseDir = hrefRaw.slice(0, lastSlash + 1);
          archivosNormalized.forEach((archivoPath) => {
            if (archivoPath.startsWith(baseDir)) {
              files.add(prefixContent ? withContentPrefix(archivoPath) : archivoPath);
            }
          });
        }
      }

      const filesXml = [...files]
        .map((fileHref) => `<file href="${escapeXml(fileHref)}" />`)
        .join('');

      return `<resource identifier="${identifier}" type="${tipo}" ${scormTypeAttribute}="${scormType}" href="${archivoHref}">${filesXml}</resource>`;
    })
    .join('');
};

const buildManifestXml = ({
  manifest,
  proyecto,
  metadata,
  organizaciones,
  items,
  recursos,
  archivos = [],
}) => {
  const orgPrincipal =
    organizaciones.find((org) => org.es_principal === 1) || organizaciones[0];
  const defaultOrgId = orgPrincipal ? orgPrincipal.identificador : 'ORG_DEFAULT';

  const orgsXml = organizaciones
    .map((org) => {
      const orgItems = items.filter((item) => item.id_organizacion === org.id_organizacion);
      const itemsTree = buildItemTree(orgItems).map((node) => buildItemXml(node)).join('');
      const identifier = escapeXml(org.identificador);
      const title = escapeXml(org.titulo);
      return `<organization identifier="${identifier}"><title>${title}</title>${itemsTree}</organization>`;
    })
    .join('');

  const resourcesXml = buildResourcesXml(recursos, archivos, {
    prefixContent: true,
    scormTypeAttribute: 'adlcp:scormtype',
  });
  const titulo = proyecto ? escapeXml(proyecto.titulo) : '';
  const descripcion = proyecto ? escapeXml(proyecto.descripcion || '') : '';
  const palabras = metadata && metadata.palabras_clave ? escapeXml(metadata.palabras_clave) : '';
  const idioma = metadata && metadata.idioma ? escapeXml(metadata.idioma) : 'es';
  const autor = metadata && metadata.autor_principal ? escapeXml(metadata.autor_principal) : '';
  const publicador =
    metadata && metadata.entidad_publicadora ? escapeXml(metadata.entidad_publicadora) : '';

  const lifecycle =
    autor || publicador
      ? `<imsmd:lifeCycle>
        ${autor ? `<imsmd:contribute>
          <imsmd:role>
            <imsmd:source>LOMv1.0</imsmd:source>
            <imsmd:value>author</imsmd:value>
          </imsmd:role>
          <imsmd:entity><![CDATA[${autor}]]></imsmd:entity>
        </imsmd:contribute>` : ''}
        ${publicador ? `<imsmd:contribute>
          <imsmd:role>
            <imsmd:source>LOMv1.0</imsmd:source>
            <imsmd:value>publisher</imsmd:value>
          </imsmd:role>
          <imsmd:entity><![CDATA[${publicador}]]></imsmd:entity>
        </imsmd:contribute>` : ''}
      </imsmd:lifeCycle>`
      : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${escapeXml(manifest.identificador)}"
  version="${escapeXml(manifest.version || '1.0')}"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
  xmlns:imsmd="http://www.imsglobal.org/xsd/imsmd_rootv1p2p1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd
  http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd
  http://www.imsglobal.org/xsd/imsmd_rootv1p2p1 imsmd_rootv1p2p1.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
    <imsmd:lom>
      <imsmd:general>
        <imsmd:title><imsmd:string language="${idioma}">${titulo}</imsmd:string></imsmd:title>
        <imsmd:description><imsmd:string language="${idioma}">${descripcion}</imsmd:string></imsmd:description>
        <imsmd:keyword><imsmd:string language="${idioma}">${palabras}</imsmd:string></imsmd:keyword>
      </imsmd:general>
      ${lifecycle}
    </imsmd:lom>
  </metadata>
  <organizations default="${escapeXml(defaultOrgId)}">
    ${orgsXml}
  </organizations>
  <resources>
    ${resourcesXml}
  </resources>
</manifest>`;
};

const buildManifestXml2004 = ({
  manifest,
  proyecto,
  metadata,
  organizaciones,
  items,
  recursos,
  archivos = [],
}) => {
  const orgPrincipal =
    organizaciones.find((org) => org.es_principal === 1) || organizaciones[0];
  const defaultOrgId = orgPrincipal ? orgPrincipal.identificador : 'ORG_DEFAULT';

  const orgsXml = organizaciones
    .map((org) => {
      const orgItems = items.filter((item) => item.id_organizacion === org.id_organizacion);
      const itemsTree = buildItemTree(orgItems).map((node) => buildItemXml(node)).join('');
      const identifier = escapeXml(org.identificador);
      const title = escapeXml(org.titulo);
      return `<organization identifier="${identifier}"><title>${title}</title>${itemsTree}</organization>`;
    })
    .join('');

  const resourcesXml = buildResourcesXml(recursos, archivos, {
    prefixContent: true,
    scormTypeAttribute: 'adlcp:scormType',
  });
  const titulo = proyecto ? escapeXml(proyecto.titulo) : '';
  const descripcion = proyecto ? escapeXml(proyecto.descripcion || '') : '';
  const palabras = metadata && metadata.palabras_clave ? escapeXml(metadata.palabras_clave) : '';
  const idioma = metadata && metadata.idioma ? escapeXml(metadata.idioma) : 'es';
  const autor = metadata && metadata.autor_principal ? escapeXml(metadata.autor_principal) : '';
  const publicador =
    metadata && metadata.entidad_publicadora ? escapeXml(metadata.entidad_publicadora) : '';

  const lifecycle =
    autor || publicador
      ? `<imsmd:lifeCycle>
        ${autor ? `<imsmd:contribute>
          <imsmd:role>
            <imsmd:source>LOMv1.0</imsmd:source>
            <imsmd:value>author</imsmd:value>
          </imsmd:role>
          <imsmd:entity><![CDATA[${autor}]]></imsmd:entity>
        </imsmd:contribute>` : ''}
        ${publicador ? `<imsmd:contribute>
          <imsmd:role>
            <imsmd:source>LOMv1.0</imsmd:source>
            <imsmd:value>publisher</imsmd:value>
          </imsmd:role>
          <imsmd:entity><![CDATA[${publicador}]]></imsmd:entity>
        </imsmd:contribute>` : ''}
      </imsmd:lifeCycle>`
      : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${escapeXml(manifest.identificador)}"
  version="${escapeXml(manifest.version || '1.0')}"
  xmlns="http://www.imsglobal.org/xsd/imscp_v1p1"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_v1p3"
  xmlns:imsmd="http://www.imsglobal.org/xsd/imsmd_rootv1p2p1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsglobal.org/xsd/imscp_v1p1 imscp_v1p1.xsd
  http://www.adlnet.org/xsd/adlcp_v1p3 adlcp_v1p3.xsd
  http://www.imsglobal.org/xsd/imsmd_rootv1p2p1 imsmd_rootv1p2p1.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>2004 4th Edition</schemaversion>
    <imsmd:lom>
      <imsmd:general>
        <imsmd:title><imsmd:string language="${idioma}">${titulo}</imsmd:string></imsmd:title>
        <imsmd:description><imsmd:string language="${idioma}">${descripcion}</imsmd:string></imsmd:description>
        <imsmd:keyword><imsmd:string language="${idioma}">${palabras}</imsmd:string></imsmd:keyword>
      </imsmd:general>
      ${lifecycle}
    </imsmd:lom>
  </metadata>
  <organizations default="${escapeXml(defaultOrgId)}">
    ${orgsXml}
  </organizations>
  <resources>
    ${resourcesXml}
  </resources>
</manifest>`;
};

const validateScormData = ({ manifest, organizaciones, items, recursos, archivos }) => {
  const errors = [];

  if (!manifest || !manifest.identificador) {
    errors.push('Manifest sin identificador');
  }

  const orgIds = new Set();
  organizaciones.forEach((org) => {
    if (!org.identificador) {
      errors.push(`Organizacion sin identificador (id_organizacion=${org.id_organizacion})`);
      return;
    }
    if (orgIds.has(org.identificador)) {
      errors.push(`Identificador de organizacion duplicado: ${org.identificador}`);
    }
    orgIds.add(org.identificador);
  });

  const resourceIds = new Set();
  const resourceIdByPk = new Map();
  recursos.forEach((recurso) => {
    if (!recurso.identificador) {
      errors.push(`Recurso sin identificador (id_recurso=${recurso.id_recurso})`);
      return;
    }
    if (resourceIds.has(recurso.identificador)) {
      errors.push(`Identificador de recurso duplicado: ${recurso.identificador}`);
    }
    resourceIds.add(recurso.identificador);
    resourceIdByPk.set(recurso.id_recurso, recurso.identificador);

    const hrefCandidate = normalizeRelativePath(recurso.href || recurso.nombre_fisico);
    if (!hrefCandidate) {
      errors.push(`Href invalido en recurso ${recurso.identificador}`);
    }
  });

  const itemIds = new Set();
  items.forEach((item) => {
    if (!item.identificador) {
      errors.push(`Item sin identificador (id_item=${item.id_item})`);
      return;
    }
    if (itemIds.has(item.identificador)) {
      errors.push(`Identificador de item duplicado: ${item.identificador}`);
    }
    itemIds.add(item.identificador);
    if (item.id_recurso && !resourceIdByPk.has(item.id_recurso)) {
      errors.push(`Item sin recurso valido (id_item=${item.id_item})`);
    }
  });

  archivos.forEach((archivo) => {
    const archivoPath = normalizeRelativePath(archivo.ruta || archivo.nombre_fisico);
    if (!archivoPath) {
      errors.push(`Archivo con ruta invalida (id_archivo=${archivo.id_archivo})`);
    }
  });

  return errors;
};

const isPathInside = (targetPath, rootPath) => {
  const normalizedTarget = path.resolve(targetPath);
  const normalizedRoot = path.resolve(rootPath);
  const target = normalizedTarget.toLowerCase();
  const root = normalizedRoot.toLowerCase();
  return target === root || target.startsWith(root + path.sep);
};

const resolveArchivoPath = (archivoRuta, uploadDir) => {
  if (!archivoRuta) return null;
  const uploadRoot = path.resolve(uploadDir);
  if (path.isAbsolute(archivoRuta)) {
    const absolutePath = path.resolve(archivoRuta);
    return isPathInside(absolutePath, uploadRoot) ? absolutePath : null;
  }
  const normalized = archivoRuta.replace(/^[\\/]+/, '');
  const isUploads =
    normalized.startsWith('uploads' + path.sep) || normalized.startsWith('uploads/');
  const candidate = isUploads
    ? path.resolve(uploadRoot, '..', normalized)
    : path.resolve(uploadRoot, normalized);
  return isPathInside(candidate, uploadRoot) ? candidate : null;
};

const ensureFileExists = (filePath) => {
  if (!filePath || !fs.existsSync(filePath)) {
    return false;
  }
  return true;
};

module.exports = {
  buildManifestXml,
  buildManifestXml2004,
  buildItemTree,
  normalizeRelativePath,
  validateScormData,
  resolveArchivoPath,
  ensureFileExists,
};
