import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ScormService } from '../../../services/scorm.service';
import { ScormStateService } from '../../../services/scorm-state.service';
import { ScormNavComponent } from '../../components/scorm-nav/scorm-nav';
import { ToastService } from '../../../shared/toast/toast.service';

interface LeccionOption {
  id_leccion: number;
  id_modulo: number;
  label: string;
  nombre: string;
}

interface ModuloOption {
  id_modulo: number;
  label: string;
}

@Component({
  selector: 'app-resources',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, ScormNavComponent],
  templateUrl: './resources.html',
  styleUrls: ['./resources.scss'],
})
export class ResourcesComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private scorm = inject(ScormService);
  private state = inject(ScormStateService);
  private toast = inject(ToastService);

  recursosForm: FormGroup;
  archivoSeleccionado: File | null = null;
  lecciones: LeccionOption[] = [];
  modulos: ModuloOption[] = [];
  moduloSeleccionado: number | null = null;
  moduloItemMap: Record<number, number> = {};
  leccionItemMap: Record<number, number> = {};
  autoRecursoId = true;
  items: any[] = [];
  recursosMap: Record<number, string> = {};
  recursosLeccion: Array<{ id_item: number; id_recurso: number; titulo: string; identificador: string }> = [];
  private trackingDefaults = {
    preset: 'auto',
    auto: true,
    minMinutes: 3,
    mediaRatio: 0.85,
  };

  constructor() {
    this.recursosForm = this.fb.group({
      nombreArchivo: ['', Validators.required],
      idArchivo: [''],
      idLeccion: ['', Validators.required],
      tipoArchivo: ['', Validators.required],
      recursoId: [''],
      trackingAuto: [true],
      trackingMinMinutes: [3],
      trackingMediaRatio: [0.85],
      trackingPreset: ['auto'],
    });
  }

  ngOnInit() {
    const projectId = this.state.getProjectId();
    if (!projectId) {
      this.toast.warn('No hay proyecto activo.');
      this.router.navigate(['/metadata']);
      return;
    }

    this.scorm.obtenerProyecto(projectId).subscribe({
      next: (proyecto) => {
        const seconds = Number(proyecto?.tracking_min_seconds_default ?? 180);
        this.trackingDefaults = {
          preset: proyecto?.tracking_preset_default || 'auto',
          auto: Boolean(proyecto?.tracking_auto_default ?? true),
          minMinutes: Number.isFinite(seconds) ? Number((seconds / 60).toFixed(2)) : 3,
          mediaRatio: Number(proyecto?.tracking_media_ratio_default ?? 0.85),
        };
        this.recursosForm.patchValue({
          trackingPreset: this.trackingDefaults.preset,
          trackingAuto: this.trackingDefaults.auto,
          trackingMinMinutes: this.trackingDefaults.minMinutes,
          trackingMediaRatio: this.trackingDefaults.mediaRatio,
        });
      },
    });

    this.scorm.listarModulos(projectId).subscribe({
      next: (modulos: any[]) => {
        this.modulos = modulos.map((mod) => ({
          id_modulo: mod.id_modulo,
          label: `${mod.codigo_modulo || mod.id_modulo} - ${mod.nombre_modulo}`,
        }));
        if (!this.moduloSeleccionado && this.modulos.length) {
          this.moduloSeleccionado = this.modulos[0].id_modulo;
        }
        modulos.forEach((mod) => {
          this.scorm.listarLecciones(mod.id_modulo).subscribe({
            next: (lecciones: any[]) => {
              lecciones.forEach((lec) => {
                this.lecciones.push({
                  id_leccion: lec.id_leccion,
                  id_modulo: mod.id_modulo,
                  label: `${lec.codigo_leccion || lec.id_leccion} - ${lec.nombre_leccion}`,
                  nombre: lec.nombre_leccion,
                });
              });
            },
          });
        });
      },
    });

    const orgId = this.state.getOrganizationId();
    if (orgId) {
      this.scorm.listarItems(orgId).subscribe({
        next: (items: any[]) => {
          this.items = items || [];
          items
            .filter((item) => item.tipo_item === 'modulo')
            .forEach((item) => {
              this.moduloItemMap[item.id_modulo] = item.id_item;
            });
          items
            .filter((item) => item.id_leccion)
            .forEach((item) => {
              this.leccionItemMap[item.id_leccion] = item.id_item;
            });
        },
      });
    }

    const manifestId = this.state.getManifestId();
    if (manifestId) {
      this.scorm.listarRecursos(manifestId).subscribe({
        next: (recursos) => {
          (recursos || []).forEach((r: any) => {
            this.recursosMap[r.id_recurso] = r.identificador || r.href || `RES-${r.id_recurso}`;
          });
        },
      });
    }

    this.recursosForm.get('idLeccion')?.valueChanges.subscribe((value) => {
      this.refreshRecursosLeccion(Number(value || 0));
    });
  }

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (!file) return;

    const limiteMB = 50;
    const limiteBytes = limiteMB * 1024 * 1024;
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const isVideo = ['mp4', 'webm', 'm4v', 'mpg', 'mpeg'].includes(ext);
    const isAudio = ['mp3', 'wav'].includes(ext);
    const isImage = ['png', 'jpg', 'jpeg', 'svg', 'svgz', 'gif', 'webp', 'ico'].includes(ext);
    const isPdf = ext === 'pdf';
    const extensionesPermitidas = [
      'html',
      'js',
      'css',
      'json',
      'xml',
      'txt',
      'csv',
      'png',
      'jpg',
      'jpeg',
      'svg',
      'svgz',
      'gif',
      'webp',
      'ico',
      'woff',
      'woff2',
      'ttf',
      'otf',
      'eot',
      'mp4',
      'm4v',
      'webm',
      'mpg',
      'mpeg',
      'mp3',
      'wav',
      'pdf',
    ];

    if (file.size > limiteBytes) {
      this.toast.warn('El archivo supera el limite de 50MB.');
      event.target.value = '';
      return;
    }

    if (!extensionesPermitidas.includes(ext)) {
      this.toast.warn('Formato no soportado.');
      event.target.value = '';
      return;
    }

    this.archivoSeleccionado = file;
    this.recursosForm.patchValue({
      nombreArchivo: file.name,
      tipoArchivo: ext.toUpperCase(),
    });
    if (this.autoRecursoId) {
      this.recursosForm.patchValue({
        recursoId: this.buildCodigo('RES', file.name),
      });
    }

    const preset = this.trackingDefaults.preset || 'auto';
    if (preset === 'manual') {
      this.recursosForm.patchValue({
        trackingPreset: 'manual',
      });
      return;
    }

    if (preset === 'media' || (preset === 'auto' && (isVideo || isAudio))) {
      this.recursosForm.patchValue({
        trackingPreset: preset === 'auto' ? 'media' : preset,
        trackingAuto: this.trackingDefaults.auto,
        trackingMinMinutes: 0,
        trackingMediaRatio: this.trackingDefaults.mediaRatio,
      });
    } else if (preset === 'static' || (preset === 'auto' && (isPdf || isImage))) {
      this.recursosForm.patchValue({
        trackingPreset: preset === 'auto' ? 'static' : preset,
        trackingAuto: this.trackingDefaults.auto,
        trackingMinMinutes: this.trackingDefaults.minMinutes,
        trackingMediaRatio: this.trackingDefaults.mediaRatio,
      });
    } else {
      this.recursosForm.patchValue({
        trackingPreset: preset,
        trackingAuto: this.trackingDefaults.auto,
        trackingMinMinutes: this.trackingDefaults.minMinutes,
        trackingMediaRatio: this.trackingDefaults.mediaRatio,
      });
    }
  }

  onPresetChange(value: string) {
    if (value === 'auto' && this.archivoSeleccionado) {
      this.onFileSelected({ target: { files: [this.archivoSeleccionado] } });
      return;
    }
    if (value === 'media') {
      this.recursosForm.patchValue({
        trackingAuto: true,
        trackingMinMinutes: 0,
        trackingMediaRatio: this.trackingDefaults.mediaRatio,
      });
      return;
    }
    if (value === 'static') {
      this.recursosForm.patchValue({
        trackingAuto: true,
        trackingMinMinutes: this.trackingDefaults.minMinutes,
        trackingMediaRatio: this.trackingDefaults.mediaRatio,
      });
      return;
    }
    if (value === 'manual') {
      return;
    }
    this.recursosForm.patchValue({
      trackingAuto: this.trackingDefaults.auto,
      trackingMinMinutes: this.trackingDefaults.minMinutes,
      trackingMediaRatio: this.trackingDefaults.mediaRatio,
    });
  }

  volver() {
    this.router.navigate(['/organizations']);
  }

  guardarBorrador() {
    const projectId = this.state.getProjectId();
    if (!projectId) {
      this.toast.warn('No hay proyecto activo para guardar.');
      return;
    }

    const version = this.state.getVersion();
    this.scorm.obtenerProyecto(projectId).subscribe({
      next: (proyecto) => {
        this.scorm
          .actualizarProyecto(projectId, {
            titulo: proyecto.titulo || 'Proyecto SCORM',
            descripcion: proyecto.descripcion || '',
            version_scorm: proyecto.version_scorm || version,
            estado: 'borrador',
          })
          .subscribe({
            next: () => {
              this.toast.success('Borrador guardado.');
              this.state.clearProjectData();
              this.router.navigate(['/history']);
            },
            error: () => this.toast.error('No se pudo guardar el borrador.'),
          });
      },
      error: () => this.toast.error('No se pudo guardar el borrador.'),
    });
  }

  onModuloChange(value: string) {
    this.moduloSeleccionado = value ? Number(value) : null;
    const current = Number(this.recursosForm.value.idLeccion || 0);
    if (current) {
      const currentLeccion = this.lecciones.find((lec) => lec.id_leccion === current);
      if (!currentLeccion || currentLeccion.id_modulo !== this.moduloSeleccionado) {
        this.recursosForm.patchValue({ idLeccion: '' });
      }
    }
  }

  get leccionesFiltradas() {
    if (!this.moduloSeleccionado) return this.lecciones;
    return this.lecciones.filter((lec) => lec.id_modulo === this.moduloSeleccionado);
  }

  refreshRecursosLeccion(idLeccion: number) {
    if (!idLeccion) {
      this.recursosLeccion = [];
      return;
    }
    const list = this.items.filter((it) => it.id_leccion === idLeccion && it.tipo_item === 'sco');
    this.recursosLeccion = list.map((it) => ({
      id_item: it.id_item,
      id_recurso: it.id_recurso,
      titulo: it.titulo || this.recursosMap[it.id_recurso] || `Recurso ${it.id_recurso}`,
      identificador: it.identificador || `ITEM_${it.id_item}`,
    }));
  }

  onDragStartRecurso(item: { id_item: number }) {
    (this as any)._dragResourceId = item.id_item;
  }

  onDropRecurso(target: { id_item: number }) {
    const dragId = (this as any)._dragResourceId as number | null;
    if (!dragId || dragId === target.id_item) return;
    const fromIndex = this.recursosLeccion.findIndex((r) => r.id_item === dragId);
    const toIndex = this.recursosLeccion.findIndex((r) => r.id_item === target.id_item);
    if (fromIndex < 0 || toIndex < 0) return;
    const [moved] = this.recursosLeccion.splice(fromIndex, 1);
    this.recursosLeccion.splice(toIndex, 0, moved);
    this.persistOrdenRecursos();
  }

  private persistOrdenRecursos() {
    const idLeccion = Number(this.recursosForm.value.idLeccion);
    const parentId = this.leccionItemMap[idLeccion] || null;
    this.recursosLeccion.forEach((r, index) => {
      this.scorm.actualizarItem(r.id_item, {
        identificador: r.identificador,
        titulo: r.titulo,
        tipo_item: 'sco',
        orden: index + 1,
        es_lanzable: 1,
        id_recurso: r.id_recurso,
        id_leccion: idLeccion,
        id_padre: parentId,
      }).subscribe();
    });
  }

  private buildCodigo(prefix: string, name: string | undefined) {
    const base = String(name || '')
      .toLowerCase()
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 20);
    const suffix = base || String(Date.now()).slice(-6);
    return `${prefix}_${suffix}`.toUpperCase();
  }

  irAVistaPrevia() {
    this.router.navigate(['/preview']);
  }

  irAEditorSco() {
    this.router.navigate(['/editor-sco']);
  }

  subirArchivo() {
    if (!this.recursosForm.valid || !this.archivoSeleccionado) {
      this.toast.warn('Completa los campos y selecciona un archivo.');
      return;
    }

    const projectId = this.state.getProjectId();
    const manifestId = this.state.getManifestId();
    const orgId = this.state.getOrganizationId();
    if (!projectId || !manifestId || !orgId) {
      this.toast.warn('No hay proyecto activo.');
      return;
    }

    const idLeccion = Number(this.recursosForm.value.idLeccion);
    const leccion = this.lecciones.find((lec) => lec.id_leccion === idLeccion);
    const parentModuloItemId = leccion ? this.moduloItemMap[leccion.id_modulo] : null;
    if (!leccion || !parentModuloItemId) {
      this.toast.warn('Selecciona una leccion valida.');
      return;
    }

    const ensureLeccionItem = () => {
      const existente = this.leccionItemMap[idLeccion];
      if (existente) {
        return new Promise<number>((resolve) => resolve(existente));
      }
      const idItem = `LEC_ITEM_${idLeccion}`;
      return new Promise<number>((resolve, reject) => {
        this.scorm
          .crearItem({
            id_organizacion: orgId,
            id_padre: parentModuloItemId,
            identificador: idItem,
            titulo: leccion.nombre || leccion.label,
            tipo_item: 'leccion',
            orden: 1,
            es_lanzable: 0,
            id_leccion: idLeccion,
          })
          .subscribe({
            next: (item) => {
              this.leccionItemMap[idLeccion] = item.id_item;
              resolve(item.id_item);
            },
            error: () => reject(new Error('No se pudo crear el item de leccion')),
          });
      });
    };

    const archivoLocal = this.archivoSeleccionado;
    if (!archivoLocal) {
      this.toast.warn('Selecciona un archivo antes de continuar.');
      return;
    }

    ensureLeccionItem()
      .then((leccionItemId) => {
        this.scorm.subirArchivo(projectId, idLeccion, archivoLocal).subscribe({
          next: (archivo) => {
            const recursoId =
              String(this.recursosForm.value.recursoId || '').trim() ||
              this.buildCodigo('RES', this.recursosForm.value.nombreArchivo);
            const itemId = `ITEM_${Date.now()}`;

            this.scorm
              .crearRecurso({
                id_manifest: manifestId,
                id_archivo: archivo.id_archivo,
                identificador: recursoId,
                href: archivo.nombre_fisico,
                tipo_recurso: 'webcontent',
                scorm_type: 'sco',
                parametros: JSON.stringify({
                  auto_complete: Boolean(this.recursosForm.value.trackingAuto),
                  min_seconds: Math.max(0, Number(this.recursosForm.value.trackingMinMinutes || 0) * 60),
                  media_ratio: Number(this.recursosForm.value.trackingMediaRatio || 0.85),
                }),
              })
              .subscribe({
                next: (recurso) => {
                  this.scorm
                    .crearItem({
                      id_organizacion: orgId,
                      id_padre: leccionItemId,
                      identificador: itemId,
                      titulo: this.recursosForm.value.nombreArchivo,
                      tipo_item: 'sco',
                      orden: 1,
                      es_lanzable: 1,
                      id_leccion: idLeccion,
                      id_recurso: recurso.id_recurso,
                    })
                    .subscribe({
                      next: (resp) => {
                        const newItemId = resp?.id_item;
                        this.toast.success('Archivo subido correctamente.');
                        if (newItemId) {
                          this.items.push({
                            id_item: newItemId,
                            id_recurso: recurso.id_recurso,
                            id_leccion: idLeccion,
                            tipo_item: 'sco',
                            identificador: itemId,
                            titulo: this.recursosForm.value.nombreArchivo,
                          });
                          this.refreshRecursosLeccion(idLeccion);
                        }
                        this.recursosForm.reset({
                          trackingAuto: this.trackingDefaults.auto,
                          trackingMinMinutes: this.trackingDefaults.minMinutes,
                          trackingMediaRatio: this.trackingDefaults.mediaRatio,
                          trackingPreset: this.trackingDefaults.preset,
                        });
                        this.archivoSeleccionado = null;
                      },
                      error: () => this.toast.error('Error al crear item.'),
                    });
                },
                error: () => this.toast.error('Error al crear recurso.'),
              });
          },
          error: () => this.toast.error('Error al subir archivo.'),
        });
      })
      .catch(() => this.toast.error('Error al preparar la leccion.'));
  }

  eliminarArchivo() {
    this.recursosForm.reset({
      trackingAuto: this.trackingDefaults.auto,
      trackingMinMinutes: this.trackingDefaults.minMinutes,
      trackingMediaRatio: this.trackingDefaults.mediaRatio,
      trackingPreset: this.trackingDefaults.preset,
    });
    this.archivoSeleccionado = null;
  }
}
