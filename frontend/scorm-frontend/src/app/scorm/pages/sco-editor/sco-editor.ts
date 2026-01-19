import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ScormService } from '../../../services/scorm.service';
import { ScormStateService } from '../../../services/scorm-state.service';

interface ArchivoInfo {
  id_archivo: number;
  nombre_original: string;
  nombre_fisico: string;
  tipo_mime: string;
  tamano_bytes: number;
}

interface ScoInfo {
  id_sco: number;
  id_proyecto: number;
  titulo: string;
  descripcion: string | null;
  archivo_entrada: string;
  ancho: number | null;
  alto: number | null;
}

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './sco-editor.html',
  styleUrls: ['./sco-editor.scss'],
})
export class ScoEditorComponent implements OnInit {
  private scorm = inject(ScormService);
  private state = inject(ScormStateService);
  private fb = inject(FormBuilder);
  private sanitizer = inject(DomSanitizer);

  archivos: ArchivoInfo[] = [];
  scos: ScoInfo[] = [];
  archivosSeleccionados = new Set<number>();
  previewUrl: SafeResourceUrl | null = null;
  previewTitulo = '';
  previewSize = { width: 960, height: 540 };
  runtimeSessionId: number | null = null;
  version = '1.2';
  apiReady = false;
  private initialized = false;
  private terminated = false;
  private lastError = '0';

  scoForm: FormGroup = this.fb.group({
    titulo: ['', Validators.required],
    descripcion: [''],
    archivo_entrada: ['', Validators.required],
    ancho: [960, [Validators.min(320)]],
    alto: [540, [Validators.min(240)]],
  });

  ngOnInit() {
    const projectId = this.state.getProjectId();
    this.version = this.state.getVersion() || '1.2';
    if (!projectId) {
      alert('No hay proyecto activo.');
      return;
    }
    this.cargarArchivos(projectId);
    this.cargarScos(projectId);
  }

  cargarArchivos(id_proyecto: number) {
    this.scorm.listarArchivos(id_proyecto).subscribe({
      next: (archivos) => (this.archivos = archivos || []),
    });
  }

  cargarScos(id_proyecto: number) {
    this.scorm.listarScos(id_proyecto).subscribe({
      next: (scos) => (this.scos = scos || []),
    });
  }

  toggleArchivo(id_archivo: number, checked: boolean) {
    if (checked) {
      this.archivosSeleccionados.add(id_archivo);
    } else {
      this.archivosSeleccionados.delete(id_archivo);
    }
  }

  crearSco() {
    if (!this.scoForm.valid) {
      alert('Completa los campos obligatorios del SCO.');
      return;
    }

    const projectId = this.state.getProjectId();
    if (!projectId) {
      alert('No hay proyecto activo.');
      return;
    }

    const entrada = this.archivos.find(
      (archivo) => archivo.nombre_fisico === this.scoForm.value.archivo_entrada
    );
    if (!entrada) {
      alert('Selecciona un archivo de entrada valido.');
      return;
    }

    if (!this.archivosSeleccionados.size) {
      this.archivosSeleccionados.add(entrada.id_archivo);
    }

    this.scorm
      .crearSco({
        id_proyecto: projectId,
        titulo: this.scoForm.value.titulo,
        descripcion: this.scoForm.value.descripcion,
        archivo_entrada: entrada.nombre_fisico,
        ancho: this.scoForm.value.ancho,
        alto: this.scoForm.value.alto,
      })
      .subscribe({
        next: (resp) => {
          const idSco = resp.id_sco;
          const requests = Array.from(this.archivosSeleccionados).map((idArchivo) => {
            const archivo = this.archivos.find((item) => item.id_archivo === idArchivo);
            if (!archivo) return null;
            return this.scorm.agregarScoArchivo(idSco, {
              id_archivo: idArchivo,
              ruta_relativa: archivo.nombre_fisico,
              es_entrada: archivo.nombre_fisico === entrada.nombre_fisico,
            });
          });

          requests.filter(Boolean).forEach((req) => req?.subscribe());
          this.archivosSeleccionados.clear();
          this.scoForm.reset({ ancho: 960, alto: 540 });
          this.cargarScos(projectId);
          alert('SCO creado correctamente.');
        },
        error: () => alert('Error al crear el SCO.'),
      });
  }

  abrirPreview(sco: ScoInfo) {
    this.previewTitulo = sco.titulo;
    this.previewSize = {
      width: sco.ancho || 960,
      height: sco.alto || 540,
    };
    const url = `http://localhost:3000/uploads/${encodeURIComponent(sco.archivo_entrada)}`;
    this.previewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    this.prepararApiRuntime(sco, url);
  }

  cerrarPreview() {
    this.previewUrl = null;
    this.previewTitulo = '';
    this.apiReady = false;
    this.runtimeSessionId = null;
    this.initialized = false;
    this.terminated = false;
    this.lastError = '0';
  }

  private prepararApiRuntime(sco: ScoInfo, launchPath: string) {
    const projectId = this.state.getProjectId();
    if (!projectId) return;

    this.scorm
      .crearRuntimeSesion({
        id_proyecto: projectId,
        version_scorm: this.version,
        ruta_lanzamiento: launchPath,
        id_item: null,
        id_recurso: null,
      })
      .subscribe({
        next: (resp) => {
          this.runtimeSessionId = resp.id_sesion;
          this.inicializarApi(this.version);
          this.apiReady = true;
          this.cargarCmiInicial();
        },
        error: () => alert('No se pudo iniciar la sesion SCORM.'),
      });
  }

  private cargarCmiInicial() {
    if (!this.runtimeSessionId) return;
    this.scorm.obtenerCmi(this.runtimeSessionId).subscribe({
      next: (rows) => {
        rows.forEach((row: any) => {
          this.cmiStore.set(row.clave_cmi, row.valor_cmi);
        });
      },
    });
  }

  private cmiStore = new Map<string, any>();

  private inicializarApi(version: string) {
    const api = version === '2004_4th' ? this.crearApi2004() : this.crearApi12();
    this.initialized = false;
    this.terminated = false;
    this.lastError = '0';
    if (version === '2004_4th') {
      (window as any).API_1484_11 = api;
      (window as any).API = null;
    } else {
      (window as any).API = api;
      (window as any).API_1484_11 = null;
    }
  }

  private crearApi12() {
    return {
      LMSInitialize: () => {
        if (!this.runtimeSessionId) {
          this.setLastError('301', 'Sesion no inicializada');
          return 'false';
        }
        if (this.initialized) {
          this.setLastError('101', 'Ya inicializado');
          return 'false';
        }
        this.initialized = true;
        this.setLastError('0', '');
        return 'true';
      },
      LMSFinish: () => {
        if (!this.initialized) {
          this.setLastError('301', 'Finalizar antes de inicializar');
          return 'false';
        }
        if (this.terminated) {
          this.setLastError('101', 'Sesion ya finalizada');
          return 'false';
        }
        this.finalizarSesionRuntime();
        this.terminated = true;
        this.setLastError('0', '');
        return 'true';
      },
      LMSGetValue: (key: string) => {
        if (!this.initialized) {
          this.setLastError('301', 'GetValue antes de inicializar');
          return '';
        }
        if (this.terminated) {
          this.setLastError('101', 'Sesion ya finalizada');
          return '';
        }
        const validacion = this.validarAccesoCmi(key, 'get');
        if (!validacion.ok) {
          this.setLastError(validacion.codigo, validacion.mensaje);
          return '';
        }
        this.setLastError('0', '');
        return this.leerCmi(key);
      },
      LMSSetValue: (key: string, value: any) => {
        if (!this.initialized) {
          this.setLastError('301', 'SetValue antes de inicializar');
          return 'false';
        }
        if (this.terminated) {
          this.setLastError('101', 'Sesion ya finalizada');
          return 'false';
        }
        const validacion = this.validarAccesoCmi(key, 'set');
        if (!validacion.ok) {
          this.setLastError(validacion.codigo, validacion.mensaje);
          return 'false';
        }
        const validacionValor = this.validarValorCmi(key, value);
        if (!validacionValor.ok) {
          this.setLastError(validacionValor.codigo, validacionValor.mensaje);
          return 'false';
        }
        this.guardarCmiLocal(key, value);
        this.setLastError('0', '');
        return 'true';
      },
      LMSCommit: () => {
        if (!this.initialized) {
          this.setLastError('301', 'Commit antes de inicializar');
          return 'false';
        }
        if (this.terminated) {
          this.setLastError('101', 'Sesion ya finalizada');
          return 'false';
        }
        this.commitRuntime();
        this.setLastError('0', '');
        return 'true';
      },
      LMSGetLastError: () => this.lastError,
      LMSGetErrorString: (code: string) => this.getErrorString12(code),
      LMSGetDiagnostic: () => this.lastDiagnostic,
    };
  }

  private crearApi2004() {
    return {
      Initialize: () => {
        if (!this.runtimeSessionId) {
          this.setLastError('122', 'Sesion no inicializada');
          return 'false';
        }
        if (this.initialized) {
          this.setLastError('103', 'Ya inicializado');
          return 'false';
        }
        this.initialized = true;
        this.setLastError('0', '');
        return 'true';
      },
      Terminate: () => {
        if (!this.initialized) {
          this.setLastError('112', 'Terminate antes de inicializar');
          return 'false';
        }
        if (this.terminated) {
          this.setLastError('113', 'Sesion ya finalizada');
          return 'false';
        }
        this.finalizarSesionRuntime();
        this.terminated = true;
        this.setLastError('0', '');
        return 'true';
      },
      GetValue: (key: string) => {
        if (!this.initialized) {
          this.setLastError('122', 'GetValue antes de inicializar');
          return '';
        }
        if (this.terminated) {
          this.setLastError('123', 'Sesion ya finalizada');
          return '';
        }
        const validacion = this.validarAccesoCmi(key, 'get');
        if (!validacion.ok) {
          this.setLastError(validacion.codigo, validacion.mensaje);
          return '';
        }
        this.setLastError('0', '');
        return this.leerCmi(key);
      },
      SetValue: (key: string, value: any) => {
        if (!this.initialized) {
          this.setLastError('132', 'SetValue antes de inicializar');
          return 'false';
        }
        if (this.terminated) {
          this.setLastError('133', 'Sesion ya finalizada');
          return 'false';
        }
        const validacion = this.validarAccesoCmi(key, 'set');
        if (!validacion.ok) {
          this.setLastError(validacion.codigo, validacion.mensaje);
          return 'false';
        }
        const validacionValor = this.validarValorCmi(key, value);
        if (!validacionValor.ok) {
          this.setLastError(validacionValor.codigo, validacionValor.mensaje);
          return 'false';
        }
        this.guardarCmiLocal(key, value);
        this.setLastError('0', '');
        return 'true';
      },
      Commit: () => {
        if (!this.initialized) {
          this.setLastError('142', 'Commit antes de inicializar');
          return 'false';
        }
        if (this.terminated) {
          this.setLastError('143', 'Sesion ya finalizada');
          return 'false';
        }
        this.commitRuntime();
        this.setLastError('0', '');
        return 'true';
      },
      GetLastError: () => this.lastError,
      GetErrorString: (code: string) => this.getErrorString2004(code),
      GetDiagnostic: () => this.lastDiagnostic,
    };
  }

  private leerCmi(key: string) {
    if (!this.cmiStore.has(key)) {
      return '';
    }
    return this.cmiStore.get(key) ?? '';
  }

  private guardarCmiLocal(key: string, value: any) {
    this.cmiStore.set(key, value);
  }

  private commitRuntime() {
    if (!this.runtimeSessionId) return;
    const items = Array.from(this.cmiStore.entries()).map(([clave_cmi, valor_cmi]) => ({
      clave_cmi,
      valor_cmi,
    }));
    const sesion = this.construirDatosSesionDesdeCmi();
    this.scorm
      .commitSesion(this.runtimeSessionId, { cmi_items: items, sesion, version_scorm: this.version })
      .subscribe({
        error: (err) => console.error('Error commit runtime', err),
      });
  }

  private finalizarSesionRuntime() {
    if (!this.runtimeSessionId) return;
    const sesion = this.construirDatosSesionDesdeCmi();
    this.scorm
      .finalizarSesion(this.runtimeSessionId, { ...sesion, version_scorm: this.version })
      .subscribe({
        error: (err) => console.error('Error finalizar runtime', err),
      });
  }

  private construirDatosSesionDesdeCmi() {
    const get = (key: string) => this.cmiStore.get(key);
    const sesion: any = {};
    if (this.version === '2004_4th') {
      sesion.estado_completado = get('cmi.completion_status') || null;
      sesion.estado_exito = get('cmi.success_status') || null;
      sesion.puntuacion_raw = get('cmi.score.raw') || null;
      sesion.puntuacion_min = get('cmi.score.min') || null;
      sesion.puntuacion_max = get('cmi.score.max') || null;
      sesion.tiempo_total = get('cmi.total_time') || null;
      sesion.tiempo_sesion = get('cmi.session_time') || null;
      sesion.datos_suspendidos = get('cmi.suspend_data') || null;
      sesion.ubicacion = get('cmi.location') || null;
    } else {
      sesion.estado_leccion = get('cmi.core.lesson_status') || null;
      sesion.puntuacion_raw = get('cmi.core.score.raw') || null;
      sesion.puntuacion_min = get('cmi.core.score.min') || null;
      sesion.puntuacion_max = get('cmi.core.score.max') || null;
      sesion.tiempo_total = get('cmi.core.total_time') || null;
      sesion.tiempo_sesion = get('cmi.core.session_time') || null;
      sesion.datos_suspendidos = get('cmi.suspend_data') || null;
      sesion.ubicacion = get('cmi.core.lesson_location') || null;
    }
    return sesion;
  }

  private lastDiagnostic = '';

  private setLastError(code: string, diagnostic: string) {
    this.lastError = code;
    this.lastDiagnostic = diagnostic || '';
  }

  private validarAccesoCmi(key: string, action: 'get' | 'set') {
    if (!key || !key.startsWith('cmi.') && !key.startsWith('adl.')) {
      return { ok: false, codigo: this.version === '2004_4th' ? '401' : '401', mensaje: 'Elemento invalido' };
    }

    if (action === 'get' && this.isWriteOnly(key)) {
      return { ok: false, codigo: this.version === '2004_4th' ? '405' : '404', mensaje: 'Elemento solo escritura' };
    }
    if (action === 'set' && this.isReadOnly(key)) {
      return { ok: false, codigo: this.version === '2004_4th' ? '404' : '403', mensaje: 'Elemento solo lectura' };
    }
    return { ok: true, codigo: '0', mensaje: '' };
  }

  private validarValorCmi(key: string, value: any) {
    const texto = value === null || value === undefined ? '' : String(value);
    const is2004 = this.version === '2004_4th';
    const enumMap: Record<string, string[]> = is2004
      ? {
          'cmi.completion_status': ['completed', 'incomplete', 'not attempted', 'unknown'],
          'cmi.success_status': ['passed', 'failed', 'unknown'],
          'cmi.entry': ['ab-initio', 'resume', ''],
          'cmi.mode': ['browse', 'normal', 'review'],
          'cmi.credit': ['credit', 'no-credit'],
        }
      : {
          'cmi.core.lesson_status': ['passed', 'completed', 'failed', 'incomplete', 'browsed', 'not attempted'],
          'cmi.core.credit': ['credit', 'no-credit'],
          'cmi.core.lesson_mode': ['browse', 'normal', 'review'],
          'cmi.core.entry': ['ab-initio', 'resume', ''],
        };

    if (enumMap[key] && !enumMap[key].includes(texto)) {
      return { ok: false, codigo: is2004 ? '406' : '402', mensaje: 'Valor invalido' };
    }

    if (key.endsWith('score.raw') || key.endsWith('score.min') || key.endsWith('score.max')) {
      if (texto !== '' && Number.isNaN(Number(texto))) {
        return { ok: false, codigo: is2004 ? '406' : '402', mensaje: 'Valor invalido' };
      }
    }

    if (key === 'cmi.core.session_time') {
      const re = /^(\d{1,4}):([0-5]\d):([0-5]\d)(\.\d{1,2})?$/;
      if (texto && !re.test(texto)) {
        return { ok: false, codigo: is2004 ? '406' : '402', mensaje: 'Formato de tiempo invalido' };
      }
    }

    if (key === 'cmi.session_time') {
      const re = /^P(T(\d+H)?(\d+M)?(\d+(\.\d+)?S)?)$/;
      if (texto && !re.test(texto)) {
        return { ok: false, codigo: is2004 ? '406' : '402', mensaje: 'Formato de duracion invalido' };
      }
    }

    if (key === 'cmi.location' || key === 'cmi.core.lesson_location') {
      if (texto.length > 255) {
        return { ok: false, codigo: is2004 ? '406' : '402', mensaje: 'Ubicacion demasiado larga' };
      }
    }

    if (key.startsWith('cmi.interactions.')) {
      const interactionType = key.endsWith('.type');
      if (interactionType) {
        const allowed = is2004
          ? ['true-false', 'choice', 'fill-in', 'long-fill-in', 'matching', 'performance', 'sequencing', 'likert', 'numeric', 'other']
          : ['true-false', 'choice', 'fill-in', 'matching', 'performance', 'sequencing', 'likert', 'numeric', 'other'];
        if (!allowed.includes(texto)) {
          return { ok: false, codigo: is2004 ? '406' : '402', mensaje: 'Tipo de interaccion invalido' };
        }
      }

      if (key.endsWith('.weighting')) {
        if (texto !== '' && Number.isNaN(Number(texto))) {
          return { ok: false, codigo: is2004 ? '406' : '402', mensaje: 'Valor invalido' };
        }
      }

      if (key.endsWith('.latency')) {
        const re = is2004
          ? /^P(T(\d+H)?(\d+M)?(\d+(\.\d+)?S)?)$/
          : /^(\d{1,4}):([0-5]\d):([0-5]\d)(\.\d{1,2})?$/;
        if (texto && !re.test(texto)) {
          return { ok: false, codigo: is2004 ? '406' : '402', mensaje: 'Formato de tiempo invalido' };
        }
      }
    }

    if (key.startsWith('cmi.objectives.')) {
      if (key.includes('score.')) {
        if (texto !== '' && Number.isNaN(Number(texto))) {
          return { ok: false, codigo: is2004 ? '406' : '402', mensaje: 'Valor invalido' };
        }
      }
      if (is2004 && key.endsWith('success_status')) {
        if (!['passed', 'failed', 'unknown'].includes(texto)) {
          return { ok: false, codigo: '406', mensaje: 'Valor invalido' };
        }
      }
      if (is2004 && key.endsWith('completion_status')) {
        if (!['completed', 'incomplete', 'not attempted', 'unknown'].includes(texto)) {
          return { ok: false, codigo: '406', mensaje: 'Valor invalido' };
        }
      }
      if (!is2004 && key.endsWith('status')) {
        if (!['passed', 'completed', 'failed', 'incomplete', 'browsed', 'not attempted'].includes(texto)) {
          return { ok: false, codigo: '402', mensaje: 'Valor invalido' };
        }
      }
    }

    return { ok: true, codigo: '0', mensaje: '' };
  }

  private isReadOnly(key: string) {
    if (this.version === '2004_4th') {
      return [
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
      ].includes(key);
    }

    return [
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
    ].includes(key);
  }

  private isWriteOnly(key: string) {
    if (this.version === '2004_4th') {
      return ['cmi.exit', 'cmi.session_time'].includes(key);
    }
    return ['cmi.core.exit', 'cmi.core.session_time'].includes(key);
  }

  private getErrorString12(code: string) {
    const map: Record<string, string> = {
      '0': 'No error',
      '101': 'Excepcion general',
      '201': 'Argumento invalido',
      '301': 'No inicializado',
      '401': 'Elemento no implementado',
      '402': 'Valor invalido',
      '403': 'Elemento solo lectura',
      '404': 'Elemento solo escritura',
      '405': 'Tipo incorrecto',
    };
    return map[code] || 'Error';
  }

  private getErrorString2004(code: string) {
    const map: Record<string, string> = {
      '0': 'No error',
      '103': 'Ya inicializado',
      '112': 'Terminate antes de Initialize',
      '113': 'Terminate despues de Terminate',
      '122': 'GetValue antes de Initialize',
      '123': 'GetValue despues de Terminate',
      '132': 'SetValue antes de Initialize',
      '133': 'SetValue despues de Terminate',
      '142': 'Commit antes de Initialize',
      '143': 'Commit despues de Terminate',
      '401': 'Elemento no definido',
      '404': 'Elemento solo lectura',
      '405': 'Elemento solo escritura',
      '406': 'Tipo incorrecto',
    };
    return map[code] || 'Error';
  }
}
