// src/controllers/scorm_runtime.controller.js
const ScormRuntimeSesion = require('../models/scorm_runtime_sesion.model');
const ScormRuntimeCmi = require('../models/scorm_runtime_cmi.model');
const ScormRuntimeInteraccion = require('../models/scorm_runtime_interaccion.model');
const ScormRuntimeObjetivo = require('../models/scorm_runtime_objetivo.model');
const ScormRuntimeComentario = require('../models/scorm_runtime_comentario.model');
const { validarSet, validarGet, validarValor } = require('../services/scorm_runtime_validator');

const is2004Version = (version) => String(version || '').startsWith('2004');

const buildDefaultCmiItems = (version, data = {}) => {
  const userId = data.id_aprendiz || data.id_usuario || '';
  const userName = data.nombre_aprendiz || data.nombre_usuario || '';
  const launchData = data.datos_lanzamiento || '';
  const credit = data.credito || 'credit';
  const entry = data.modo_entrada || 'ab-initio';
  const mode12 = data.modo || 'normal';
  const mode2004 = data.modo || 'normal';

  if (is2004Version(version)) {
    return [
      { clave_cmi: 'cmi._version', valor_cmi: '1.0' },
      { clave_cmi: 'cmi.learner_id', valor_cmi: String(userId) },
      { clave_cmi: 'cmi.learner_name', valor_cmi: String(userName) },
      { clave_cmi: 'cmi.credit', valor_cmi: credit },
      { clave_cmi: 'cmi.entry', valor_cmi: entry },
      { clave_cmi: 'cmi.mode', valor_cmi: mode2004 },
      { clave_cmi: 'cmi.launch_data', valor_cmi: String(launchData) },
      { clave_cmi: 'cmi.max_time_allowed', valor_cmi: '' },
      { clave_cmi: 'cmi.time_limit_action', valor_cmi: '' },
      { clave_cmi: 'cmi.completion_threshold', valor_cmi: '' },
      { clave_cmi: 'cmi.scaled_passing_score', valor_cmi: '' },
      { clave_cmi: 'cmi.total_time', valor_cmi: 'PT0S' },
    ];
  }

  return [
    { clave_cmi: 'cmi.core.student_id', valor_cmi: String(userId) },
    { clave_cmi: 'cmi.core.student_name', valor_cmi: String(userName) },
    { clave_cmi: 'cmi.core.lesson_mode', valor_cmi: mode12 },
    { clave_cmi: 'cmi.core.credit', valor_cmi: credit },
    { clave_cmi: 'cmi.core.entry', valor_cmi: entry },
    { clave_cmi: 'cmi.core.total_time', valor_cmi: '0000:00:00' },
    { clave_cmi: 'cmi.launch_data', valor_cmi: String(launchData) },
    { clave_cmi: 'cmi.student_data.mastery_score', valor_cmi: '' },
    { clave_cmi: 'cmi.student_data.max_time_allowed', valor_cmi: '' },
    { clave_cmi: 'cmi.student_data.time_limit_action', valor_cmi: '' },
    { clave_cmi: 'cmi.comments_from_lms', valor_cmi: '' },
  ];
};

const extraerInteracciones = (version, items) => {
  const map = new Map();

  items.forEach((item) => {
    if (!item || !item.clave_cmi) return;
    const match = item.clave_cmi.match(/^cmi\.interactions\.(\d+)\.(.+)$/);
    if (!match) return;
    const idx = match[1];
    const campo = match[2];
    const entry = map.get(idx) || {
      interaccion_id: null,
      tipo_interaccion: null,
      objetivos_ids: new Set(),
      respuesta_aprendiz: null,
      resultado: null,
      ponderacion: null,
      latencia: null,
      marca_tiempo: null,
      descripcion: null,
    };

    if (campo === 'id') entry.interaccion_id = item.valor_cmi;
    if (campo === 'type') entry.tipo_interaccion = item.valor_cmi;
    if (campo === 'learner_response' || campo === 'student_response') {
      entry.respuesta_aprendiz = item.valor_cmi;
    }
    if (campo === 'result') entry.resultado = item.valor_cmi;
    if (campo === 'weighting') entry.ponderacion = item.valor_cmi;
    if (campo === 'latency') entry.latencia = item.valor_cmi;
    if (campo === 'timestamp' || campo === 'time') entry.marca_tiempo = item.valor_cmi;
    if (campo === 'description') entry.descripcion = item.valor_cmi;

    const objMatch = campo.match(version === '2004_4th'
      ? /^objective\.(\d+)\.id$/
      : /^objectives\.(\d+)\.id$/);
    if (objMatch) {
      if (item.valor_cmi) entry.objetivos_ids.add(String(item.valor_cmi));
    }

    map.set(idx, entry);
  });

  return Array.from(map.values()).map((entry) => ({
    ...entry,
    objetivos_ids: entry.objetivos_ids.size ? Array.from(entry.objetivos_ids).join(',') : null,
  }));
};

const extraerObjetivos = (version, items) => {
  const map = new Map();
  items.forEach((item) => {
    if (!item || !item.clave_cmi) return;
    const match = item.clave_cmi.match(/^cmi\.objectives\.(\d+)\.(.+)$/);
    if (!match) return;
    const idx = match[1];
    const campo = match[2];
    const entry = map.get(idx) || {
      objetivo_id: null,
      puntuacion_raw: null,
      puntuacion_min: null,
      puntuacion_max: null,
      estado_exito: null,
      estado_completado: null,
      medida_progreso: null,
      descripcion: null,
    };

    if (campo === 'id') entry.objetivo_id = item.valor_cmi;
    if (campo === 'score.raw') entry.puntuacion_raw = item.valor_cmi;
    if (campo === 'score.min') entry.puntuacion_min = item.valor_cmi;
    if (campo === 'score.max') entry.puntuacion_max = item.valor_cmi;
    if (campo === 'score.scaled') entry.puntuacion_raw = item.valor_cmi;
    if (campo === 'success_status') entry.estado_exito = item.valor_cmi;
    if (campo === 'completion_status') entry.estado_completado = item.valor_cmi;
    if (campo === 'progress_measure') entry.medida_progreso = item.valor_cmi;
    if (campo === 'description') entry.descripcion = item.valor_cmi;
    if (campo === 'status') entry.estado_exito = item.valor_cmi;

    map.set(idx, entry);
  });

  return Array.from(map.values());
};

const crearSesion = async (req, res) => {
  try {
    const { id_proyecto } = req.body;
    if (!id_proyecto) {
      return res.status(400).json({ mensaje: 'id_proyecto es obligatorio' });
    }

    const version = req.body?.version_scorm || '1.2';
    const id_sesion = await ScormRuntimeSesion.crear(req.body);
    const defaults = buildDefaultCmiItems(version, req.body);
    if (defaults.length) {
      await ScormRuntimeCmi.guardarLote(id_sesion, defaults);
    }
    return res.status(201).json({ mensaje: 'Sesion creada', id_sesion });
  } catch (err) {
    console.error('Error al crear sesion runtime:', err);
    return res.status(500).json({ mensaje: 'Error al crear sesion' });
  }
};

const obtenerSesion = async (req, res) => {
  try {
    const { id } = req.params;
    const sesion = await ScormRuntimeSesion.obtenerPorId(id);
    if (!sesion) {
      return res.status(404).json({ mensaje: 'Sesion no encontrada' });
    }
    return res.json(sesion);
  } catch (err) {
    console.error('Error al obtener sesion runtime:', err);
    return res.status(500).json({ mensaje: 'Error al obtener sesion' });
  }
};

const actualizarSesion = async (req, res) => {
  try {
    const { id } = req.params;
    const affected = await ScormRuntimeSesion.actualizar(id, req.body || {});
    if (!affected) {
      return res.status(404).json({ mensaje: 'Sesion no encontrada' });
    }
    return res.json({ mensaje: 'Sesion actualizada' });
  } catch (err) {
    console.error('Error al actualizar sesion runtime:', err);
    return res.status(500).json({ mensaje: 'Error al actualizar sesion' });
  }
};

const guardarCmi = async (req, res) => {
  try {
    const { id_sesion } = req.params;
    const { clave_cmi, valor_cmi, items, version_scorm } = req.body || {};
    const version = version_scorm || '1.2';

    if (Array.isArray(items) && items.length) {
      const errores = [];
      const normalized = [];
      items.forEach((item) => {
        if (!item || !item.clave_cmi) return;
        const error = validarSet(version, item.clave_cmi);
        if (error) {
          errores.push({ clave_cmi: item.clave_cmi, ...error });
          return;
        }
        const valorError = validarValor(version, item.clave_cmi, item.valor_cmi);
        if (valorError) {
          errores.push({ clave_cmi: item.clave_cmi, ...valorError });
          return;
        }
        normalized.push({
          clave_cmi: item.clave_cmi,
          valor_cmi: item.valor_cmi ?? null,
        });
      });

      if (errores.length) {
        await ScormRuntimeSesion.actualizar(id_sesion, { ultimo_error: errores[0].codigo });
        return res.status(400).json({ mensaje: 'Errores en CMI', errores });
      }

      await ScormRuntimeCmi.guardarLote(id_sesion, normalized);
      return res.json({ mensaje: 'CMI guardado' });
    }

    if (!clave_cmi) {
      return res.status(400).json({ mensaje: 'clave_cmi es obligatoria' });
    }

    const error = validarSet(version, clave_cmi);
    if (error) {
      await ScormRuntimeSesion.actualizar(id_sesion, { ultimo_error: error.codigo });
      return res.status(400).json({ mensaje: error.mensaje, codigo: error.codigo });
    }
    const valorError = validarValor(version, clave_cmi, valor_cmi);
    if (valorError) {
      await ScormRuntimeSesion.actualizar(id_sesion, { ultimo_error: valorError.codigo });
      return res.status(400).json({ mensaje: valorError.mensaje, codigo: valorError.codigo });
    }

    await ScormRuntimeCmi.guardar(id_sesion, clave_cmi, valor_cmi ?? null);
    return res.json({ mensaje: 'CMI guardado' });
  } catch (err) {
    console.error('Error al guardar CMI:', err);
    return res.status(500).json({ mensaje: 'Error al guardar CMI' });
  }
};

const obtenerCmi = async (req, res) => {
  try {
    const { id_sesion } = req.params;
    const { prefix, version_scorm, clave_cmi } = req.query;
    const version = version_scorm || '1.2';

    if (clave_cmi) {
      const error = validarGet(version, String(clave_cmi));
      if (error) {
        await ScormRuntimeSesion.actualizar(id_sesion, { ultimo_error: error.codigo });
        return res.status(400).json({ mensaje: error.mensaje, codigo: error.codigo });
      }
    }

    const rows = await ScormRuntimeCmi.obtenerPorSesion(id_sesion, prefix);
    return res.json(rows);
  } catch (err) {
    console.error('Error al obtener CMI:', err);
    return res.status(500).json({ mensaje: 'Error al obtener CMI' });
  }
};

const agregarInteraccion = async (req, res) => {
  try {
    const { id_sesion } = req.params;
    const { interaccion_id } = req.body;
    if (!interaccion_id) {
      return res.status(400).json({ mensaje: 'interaccion_id es obligatorio' });
    }
    const id_interaccion = await ScormRuntimeInteraccion.crear({
      id_sesion,
      ...req.body,
    });
    return res.status(201).json({ mensaje: 'Interaccion creada', id_interaccion });
  } catch (err) {
    console.error('Error al crear interaccion:', err);
    return res.status(500).json({ mensaje: 'Error al crear interaccion' });
  }
};

const agregarObjetivo = async (req, res) => {
  try {
    const { id_sesion } = req.params;
    const { objetivo_id } = req.body;
    if (!objetivo_id) {
      return res.status(400).json({ mensaje: 'objetivo_id es obligatorio' });
    }
    const id_objetivo = await ScormRuntimeObjetivo.crear({
      id_sesion,
      ...req.body,
    });
    return res.status(201).json({ mensaje: 'Objetivo creado', id_objetivo });
  } catch (err) {
    console.error('Error al crear objetivo:', err);
    return res.status(500).json({ mensaje: 'Error al crear objetivo' });
  }
};

const agregarComentario = async (req, res) => {
  try {
    const { id_sesion } = req.params;
    const { texto_comentario } = req.body;
    if (!texto_comentario) {
      return res.status(400).json({ mensaje: 'texto_comentario es obligatorio' });
    }
    const id_comentario = await ScormRuntimeComentario.crear({
      id_sesion,
      ...req.body,
    });
    return res.status(201).json({ mensaje: 'Comentario creado', id_comentario });
  } catch (err) {
    console.error('Error al crear comentario:', err);
    return res.status(500).json({ mensaje: 'Error al crear comentario' });
  }
};

const commitSesion = async (req, res) => {
  try {
    const { id_sesion } = req.params;
    const { cmi_items, sesion, version_scorm } = req.body || {};
    const version = version_scorm || '1.2';

    if (Array.isArray(cmi_items) && cmi_items.length) {
      const errores = [];
      const normalized = cmi_items
        .filter((item) => item && item.clave_cmi)
        .map((item) => {
          const error = validarSet(version, item.clave_cmi);
          if (error) {
            errores.push({ clave_cmi: item.clave_cmi, ...error });
            return null;
          }
          const valorError = validarValor(version, item.clave_cmi, item.valor_cmi);
          if (valorError) {
            errores.push({ clave_cmi: item.clave_cmi, ...valorError });
            return null;
          }
          return {
            clave_cmi: item.clave_cmi,
            valor_cmi: item.valor_cmi ?? null,
          };
        })
        .filter(Boolean);

      if (errores.length) {
        await ScormRuntimeSesion.actualizar(id_sesion, { ultimo_error: errores[0].codigo });
        return res.status(400).json({ mensaje: 'Errores en CMI', errores });
      }
      await ScormRuntimeCmi.guardarLote(id_sesion, normalized);

      const interacciones = extraerInteracciones(version, cmi_items);
      for (const interaccion of interacciones) {
        if (!interaccion.interaccion_id) continue;
        await ScormRuntimeInteraccion.guardar({
          id_sesion,
          ...interaccion,
        });
      }

      const objetivos = extraerObjetivos(version, cmi_items);
      for (const objetivo of objetivos) {
        if (!objetivo.objetivo_id) continue;
        await ScormRuntimeObjetivo.guardar({
          id_sesion,
          ...objetivo,
        });
      }
    }

    if (sesion) {
      await ScormRuntimeSesion.actualizar(id_sesion, sesion);
    }

    return res.json({ mensaje: 'Commit realizado' });
  } catch (err) {
    console.error('Error al hacer commit:', err);
    return res.status(500).json({ mensaje: 'Error al hacer commit' });
  }
};

const finalizarSesion = async (req, res) => {
  try {
    const { id_sesion } = req.params;
    const affected = await ScormRuntimeSesion.actualizar(id_sesion, req.body || {});
    if (!affected) {
      return res.status(404).json({ mensaje: 'Sesion no encontrada' });
    }
    return res.json({ mensaje: 'Sesion finalizada' });
  } catch (err) {
    console.error('Error al finalizar sesion:', err);
    return res.status(500).json({ mensaje: 'Error al finalizar sesion' });
  }
};

module.exports = {
  crearSesion,
  obtenerSesion,
  actualizarSesion,
  guardarCmi,
  obtenerCmi,
  agregarInteraccion,
  agregarObjetivo,
  agregarComentario,
  commitSesion,
  finalizarSesion,
};
