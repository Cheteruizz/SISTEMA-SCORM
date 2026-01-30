// src/services/scorm_manifest_validator.js
const { normalizeRelativePath } = require('./scorm12');

const SCORM_TYPES = new Set(['sco', 'asset']);

const ensureUnique = (values, label) => {
  const errors = [];
  const seen = new Set();
  values.forEach((value) => {
    if (!value) return;
    if (seen.has(value)) {
      errors.push(`Identificador duplicado en ${label}: ${value}`);
    }
    seen.add(value);
  });
  return errors;
};

const validateResource = (resource) => {
  const errors = [];
  if (!resource || !resource.identificador) {
    errors.push('Recurso sin identificador');
    return errors;
  }
  const href = normalizeRelativePath(resource.href || '');
  if (!href) {
    errors.push(`Href invalido en recurso ${resource.identificador}`);
  }
  const scormType = (resource.scorm_type || '').toLowerCase();
  if (scormType && !SCORM_TYPES.has(scormType)) {
    errors.push(`scormType invalido en recurso ${resource.identificador}`);
  }
  return errors;
};

const validateItemTree = (items, resourceIds, errors, warnings) => {
  (items || []).forEach((item) => {
    const identifier = item.identifier || item.identificador;
    if (!identifier) {
      errors.push('Item sin identificador');
    }
    const identifierref = item.identifierref || item.recurso_identificador || null;
    if (identifierref && !resourceIds.has(identifierref)) {
      errors.push(`Item referencia recurso inexistente: ${identifierref}`);
    }
    if (!identifierref && (!item.item && !item.children)) {
      warnings.push(`Item sin recurso asociado: ${identifier || 'sin-id'}`);
    }
    const children = item.item || item.children || [];
    if (children.length) {
      validateItemTree(children, resourceIds, errors, warnings);
    }
  });
};

const validateManifestModel = ({ manifest, organizaciones, items, recursos, version }) => {
  const errors = [];
  const warnings = [];

  if (!manifest || !manifest.identificador) {
    errors.push('Manifest sin identificador');
  }

  if (!organizaciones || !organizaciones.length) {
    errors.push('El manifest debe tener al menos una organizacion');
  }

  const orgIds = organizaciones.map((org) => org.identificador);
  errors.push(...ensureUnique(orgIds, 'organizacion'));

  const resourceIds = new Set(recursos.map((res) => res.identificador));
  errors.push(...ensureUnique(recursos.map((res) => res.identificador), 'recurso'));

  recursos.forEach((recurso) => {
    errors.push(...validateResource(recurso));
  });

  errors.push(...ensureUnique(items.map((item) => item.identificador), 'item'));

  const defaultOrg =
    organizaciones.find((org) => org.es_principal === 1) || organizaciones[0];
  if (!defaultOrg) {
    errors.push('Organizacion default no definida');
  }

  items.forEach((item) => {
    if (item.id_recurso && !resourceIds.has(item.recurso_identificador)) {
      errors.push(`Item con recurso invalido (id_item=${item.id_item})`);
    }
  });

  if (version && version.startsWith('2004')) {
    const hasScormType = recursos.some((res) => (res.scorm_type || '').toLowerCase() === 'sco');
    if (!hasScormType) {
      errors.push('El manifest 2004 no contiene recursos tipo SCO');
    }
  }

  return { errors, warnings };
};

const detectScormVersion = (metadata = {}) => {
  const schemaversion = String(metadata.schemaversion || '').toLowerCase();
  if (schemaversion.includes('2004')) {
    if (schemaversion.includes('4th')) return '2004_4th';
    if (schemaversion.includes('3rd')) return '2004_3rd';
    if (schemaversion.includes('2nd')) return '2004_2nd';
    if (schemaversion.includes('1st')) return '2004_1st';
    return '2004_4th';
  }
  if (schemaversion.includes('1.2') || schemaversion.includes('1.1')) {
    return '1.2';
  }
  return null;
};

const validateManifestImportData = ({ manifest, organizations, resources }) => {
  const errors = [];
  const warnings = [];

  if (!manifest?.identificador) {
    errors.push('Manifest sin identificador');
  }

  const orgIds = organizations.map((org) => org.identificador);
  errors.push(...ensureUnique(orgIds, 'organizacion'));

  const resourceIds = new Set();
  resources.forEach((res) => {
    if (!res.identificador) {
      errors.push('Recurso sin identificador');
      return;
    }
    if (resourceIds.has(res.identificador)) {
      errors.push(`Identificador de recurso duplicado: ${res.identificador}`);
    }
    resourceIds.add(res.identificador);
    errors.push(...validateResource(res));
  });

  organizations.forEach((org) => {
    const items = org.items || [];
    const itemIds = new Set();
    items.forEach((item) => {
      const identifier = item.identifier || item.identificador;
      if (!identifier) {
        errors.push(`Item sin identificador en organizacion ${org.identificador}`);
        return;
      }
      if (itemIds.has(identifier)) {
        errors.push(`Identificador de item duplicado: ${identifier}`);
      }
      itemIds.add(identifier);
    });
    validateItemTree(items, resourceIds, errors, warnings);
  });

  return { errors, warnings };
};

module.exports = {
  validateManifestModel,
  validateManifestImportData,
  detectScormVersion,
};
