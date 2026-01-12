// src/services/scorm12.js
const path = require('path');
const fs = require('fs');

const escapeXml = (value) => {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
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
  const identifierref = node.id_recurso ? ` identifierref="${escapeXml(node.recurso_identificador)}"` : '';

  const childrenXml = (node.children || []).map(buildItemXml).join('');
  return `<item identifier="${identifier}"${identifierref} isvisible="${isVisible}"><title>${title}</title>${childrenXml}</item>`;
};

const buildResourcesXml = (recursos) => {
  return recursos
    .map((recurso) => {
      const identifier = escapeXml(recurso.identificador);
      const href = escapeXml(recurso.href);
      const tipo = escapeXml(recurso.tipo_recurso);
      const scormType = escapeXml(recurso.scorm_type || 'sco');
      const archivoHref = href || escapeXml(recurso.nombre_fisico);
      return `<resource identifier="${identifier}" type="${tipo}" adlcp:scormtype="${scormType}" href="${archivoHref}"><file href="${archivoHref}" /></resource>`;
    })
    .join('');
};

const buildManifestXml = ({ manifest, proyecto, metadata, organizaciones, items, recursos }) => {
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

  const resourcesXml = buildResourcesXml(recursos);
  const titulo = proyecto ? escapeXml(proyecto.titulo) : '';
  const descripcion = proyecto ? escapeXml(proyecto.descripcion || '') : '';
  const palabras = metadata && metadata.palabras_clave ? escapeXml(metadata.palabras_clave) : '';
  const idioma = metadata && metadata.idioma ? escapeXml(metadata.idioma) : 'es';

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

const buildManifestXml2004 = ({ manifest, proyecto, metadata, organizaciones, items, recursos }) => {
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

  const resourcesXml = buildResourcesXml(recursos);
  const titulo = proyecto ? escapeXml(proyecto.titulo) : '';
  const descripcion = proyecto ? escapeXml(proyecto.descripcion || '') : '';
  const palabras = metadata && metadata.palabras_clave ? escapeXml(metadata.palabras_clave) : '';
  const idioma = metadata && metadata.idioma ? escapeXml(metadata.idioma) : 'es';

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

const resolveArchivoPath = (archivoRuta, uploadDir) => {
  if (!archivoRuta) return null;
  if (path.isAbsolute(archivoRuta)) return archivoRuta;
  const normalized = archivoRuta.replace(/^[\\/]+/, '');
  if (normalized.startsWith('uploads' + path.sep) || normalized.startsWith('uploads/')) {
    return path.resolve(uploadDir, '..', normalized);
  }
  return path.resolve(uploadDir, normalized);
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
  resolveArchivoPath,
  ensureFileExists,
};
