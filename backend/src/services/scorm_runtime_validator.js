// src/services/scorm_runtime_validator.js

const SCORM12_READ_ONLY = new Set([
  'cmi.core.student_id',
  'cmi.core.student_name',
  'cmi.core.lesson_mode',
  'cmi.core.credit',
  'cmi.core.entry',
  'cmi.core.total_time',
  'cmi.launch_data',
  'cmi.student_data.mastery_score',
  'cmi.student_data.max_time_allowed',
  'cmi.student_data.time_limit_action',
  'cmi.comments_from_lms',
]);

const SCORM12_WRITE_ONLY = new Set(['cmi.core.exit', 'cmi.core.session_time']);

const SCORM2004_READ_ONLY = new Set([
  'cmi._version',
  'cmi.learner_id',
  'cmi.learner_name',
  'cmi.credit',
  'cmi.entry',
  'cmi.mode',
  'cmi.launch_data',
  'cmi.max_time_allowed',
  'cmi.time_limit_action',
  'cmi.completion_threshold',
  'cmi.scaled_passing_score',
  'cmi.total_time',
]);

const SCORM2004_WRITE_ONLY = new Set(['cmi.exit', 'cmi.session_time']);

const SCORM12_ENUMS = {
  'cmi.core.lesson_status': new Set(['passed', 'completed', 'failed', 'incomplete', 'browsed', 'not attempted']),
  'cmi.core.credit': new Set(['credit', 'no-credit']),
  'cmi.core.lesson_mode': new Set(['browse', 'normal', 'review']),
  'cmi.core.entry': new Set(['ab-initio', 'resume', '']),
};

const SCORM2004_ENUMS = {
  'cmi.completion_status': new Set(['completed', 'incomplete', 'not attempted', 'unknown']),
  'cmi.success_status': new Set(['passed', 'failed', 'unknown']),
  'cmi.entry': new Set(['ab-initio', 'resume', '']),
  'cmi.mode': new Set(['browse', 'normal', 'review']),
  'cmi.credit': new Set(['credit', 'no-credit']),
};

const SCORM12_TIME_RE = /^(\d{1,4}):([0-5]\d):([0-5]\d)(\.\d{1,2})?$/;
const SCORM2004_DURATION_RE = /^P(T(\d+H)?(\d+M)?(\d+(\.\d+)?S)?)$/;

const SCORM12_INTERACTION_TYPES = new Set([
  'true-false',
  'choice',
  'fill-in',
  'matching',
  'performance',
  'sequencing',
  'likert',
  'numeric',
  'other',
]);

const SCORM2004_INTERACTION_TYPES = new Set([
  'true-false',
  'choice',
  'fill-in',
  'long-fill-in',
  'matching',
  'performance',
  'sequencing',
  'likert',
  'numeric',
  'other',
]);

const is2004Version = (version) => String(version || '').startsWith('2004');

const getInteractionPattern = (version) => {
  if (is2004Version(version)) {
    return /^cmi\.interactions\.(\d+)\.(id|type|objective\.\d+\.id|learner_response|result|weighting|latency|timestamp|description)$/;
  }
  return /^cmi\.interactions\.(\d+)\.(id|type|objectives\.\d+\.id|student_response|result|weighting|latency|time)$/;
};

const getObjectivePattern = (version) => {
  if (is2004Version(version)) {
    return /^cmi\.objectives\.(\d+)\.(id|score\.(raw|min|max|scaled)|success_status|completion_status|progress_measure|description)$/;
  }
  return /^cmi\.objectives\.(\d+)\.(id|score\.(raw|min|max)|status)$/;
};

const isInteractionKey = (version, key) => getInteractionPattern(version).test(key);
const isObjectiveKey = (version, key) => getObjectivePattern(version).test(key);

const validarInteraccionValor = (version, key, value) => {
  const valueText = value === null || value === undefined ? '' : String(value);
  if (key.endsWith('.type')) {
    const types = is2004Version(version) ? SCORM2004_INTERACTION_TYPES : SCORM12_INTERACTION_TYPES;
    if (!types.has(valueText)) {
      return buildError(version, is2004Version(version) ? 406 : 402, 'Tipo de interaccion invalido');
    }
  }

  if (key.endsWith('.weighting')) {
    if (valueText !== '' && Number.isNaN(Number(valueText))) {
      return buildError(version, is2004Version(version) ? 406 : 402, 'Valor invalido');
    }
  }

  if (key.endsWith('.latency')) {
    if (is2004Version(version)) {
      if (valueText && !SCORM2004_DURATION_RE.test(valueText)) {
        return buildError(version, 406, 'Formato de duracion invalido');
      }
    } else if (valueText && !SCORM12_TIME_RE.test(valueText)) {
      return buildError(version, 402, 'Formato de tiempo invalido');
    }
  }

  return null;
};

const validarObjetivoValor = (version, key, value) => {
  const valueText = value === null || value === undefined ? '' : String(value);
  if (key.includes('score.')) {
    if (valueText !== '' && Number.isNaN(Number(valueText))) {
      return buildError(version, is2004Version(version) ? 406 : 402, 'Valor invalido');
    }
  }
  if (is2004Version(version)) {
    if (key.endsWith('success_status')) {
      if (!SCORM2004_ENUMS['cmi.success_status'].has(valueText)) {
        return buildError(version, 406, 'Valor invalido');
      }
    }
    if (key.endsWith('completion_status')) {
      if (!SCORM2004_ENUMS['cmi.completion_status'].has(valueText)) {
        return buildError(version, 406, 'Valor invalido');
      }
    }
    if (key.endsWith('progress_measure')) {
      if (valueText !== '' && Number.isNaN(Number(valueText))) {
        return buildError(version, 406, 'Valor invalido');
      }
    }
  } else if (key.endsWith('status')) {
    if (!SCORM12_ENUMS['cmi.core.lesson_status'].has(valueText)) {
      return buildError(version, 402, 'Valor invalido');
    }
  }
  return null;
};

const isScormKey = (key) => {
  if (!key) return false;
  return key.startsWith('cmi.') || key.startsWith('adl.');
};

const isReadOnly = (version, key) => {
  if (is2004Version(version)) {
    return SCORM2004_READ_ONLY.has(key);
  }
  return SCORM12_READ_ONLY.has(key);
};

const isWriteOnly = (version, key) => {
  if (is2004Version(version)) {
    return SCORM2004_WRITE_ONLY.has(key);
  }
  return SCORM12_WRITE_ONLY.has(key);
};

const buildError = (version, code, message) => ({
  codigo: String(code),
  mensaje: message,
  version,
});

const validarSet = (version, key) => {
  if (!isScormKey(key)) {
    return buildError(version, is2004Version(version) ? 401 : 401, 'Elemento invalido');
  }
  if (isReadOnly(version, key)) {
    return buildError(version, is2004Version(version) ? 404 : 403, 'Elemento es solo lectura');
  }
  return null;
};

const validarGet = (version, key) => {
  if (!isScormKey(key)) {
    return buildError(version, is2004Version(version) ? 401 : 401, 'Elemento invalido');
  }
  if (isWriteOnly(version, key)) {
    return buildError(version, is2004Version(version) ? 405 : 404, 'Elemento es solo escritura');
  }
  return null;
};

const validarValor = (version, key, value) => {
  const is2004 = is2004Version(version);
  const enums = is2004 ? SCORM2004_ENUMS : SCORM12_ENUMS;
  const valueText = value === null || value === undefined ? '' : String(value);

  if (enums[key]) {
    if (!enums[key].has(valueText)) {
      return buildError(version, is2004 ? 406 : 402, 'Valor invalido');
    }
  }

  if (
    key.endsWith('score.raw') ||
    key.endsWith('score.min') ||
    key.endsWith('score.max') ||
    key.endsWith('score.scaled')
  ) {
    if (valueText !== '' && Number.isNaN(Number(valueText))) {
      return buildError(version, is2004 ? 406 : 402, 'Valor invalido');
    }
  }

  if (key === 'cmi.core.session_time') {
    if (valueText && !SCORM12_TIME_RE.test(valueText)) {
      return buildError(version, is2004 ? 406 : 402, 'Formato de tiempo invalido');
    }
  }

  if (key === 'cmi.session_time') {
    if (valueText && !SCORM2004_DURATION_RE.test(valueText)) {
      return buildError(version, is2004 ? 406 : 402, 'Formato de duracion invalido');
    }
  }

  if (key === 'cmi.location' || key === 'cmi.core.lesson_location') {
    if (valueText.length > 255) {
      return buildError(version, is2004 ? 406 : 402, 'Ubicacion demasiado larga');
    }
  }

  if (isInteractionKey(version, key)) {
    return validarInteraccionValor(version, key, value);
  }

  if (isObjectiveKey(version, key)) {
    return validarObjetivoValor(version, key, value);
  }

  return null;
};

module.exports = {
  validarSet,
  validarGet,
  validarValor,
};
