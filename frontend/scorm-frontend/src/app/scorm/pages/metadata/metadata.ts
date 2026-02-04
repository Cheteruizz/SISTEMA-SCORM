import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ScormService } from '../../../services/scorm.service';
import { ScormStateService } from '../../../services/scorm-state.service';
import { ScormNavComponent } from '../../components/scorm-nav/scorm-nav';
import { ToastService } from '../../../shared/toast/toast.service';

type Paso = 'explicacion' | 'infoBasica' | 'autoria';

@Component({
  selector: 'app-metadata',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ScormNavComponent],
  templateUrl: './metadata.html',
  styleUrls: ['./metadata.scss'],
})
export class MetadataComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private scorm = inject(ScormService);
  private state = inject(ScormStateService);
  private toast = inject(ToastService);

  pasoActual: Paso = 'explicacion';
  metadataForm: FormGroup;
  coverFile: File | null = null;
  coverPreview: string | null = null;

  constructor() {
    this.metadataForm = this.fb.group({
      titulo: ['', Validators.required],
      descripcion: [''],
      idioma: ['es', Validators.required],
      autor: [''],
      organizacion: [''],
      entidadPublicadora: [''],
      trackingPresetDefault: ['auto'],
      trackingAutoDefault: [true],
      trackingMinMinutesDefault: [3],
      trackingMediaRatioDefault: [0.85],
    });
  }

  cambiarPaso(nuevoPaso: Paso) {
    this.pasoActual = nuevoPaso;
  }

  volver() {
    this.router.navigate(['/layout']);
  }

  onCoverSelected(event: any) {
    const file: File = event.target.files[0];
    if (!file) return;

    const limiteMB = 5;
    const limiteBytes = limiteMB * 1024 * 1024;
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const permitidos = ['jpg', 'jpeg', 'png', 'webp'];

    if (file.size > limiteBytes) {
      this.toast.warn('La portada supera el limite de 5MB.');
      event.target.value = '';
      return;
    }

    if (!permitidos.includes(ext)) {
      this.toast.warn('Formato de portada no soportado. Usa JPG, PNG o WebP.');
      event.target.value = '';
      return;
    }

    if (this.coverPreview) {
      URL.revokeObjectURL(this.coverPreview);
    }
    this.coverFile = file;
    this.coverPreview = URL.createObjectURL(file);
  }

  limpiarPortada() {
    if (this.coverPreview) {
      URL.revokeObjectURL(this.coverPreview);
    }
    this.coverFile = null;
    this.coverPreview = null;
  }

  guardarBorrador() {
    const existingId = this.state.getProjectId();
    if (existingId) {
      this.marcarProyectoComoBorrador(existingId);
      return;
    }

    const userId = this.state.getUserId();
    if (!userId) {
      this.toast.warn('Debes iniciar sesion para guardar un borrador.');
      this.router.navigate(['/home']);
      return;
    }

    const values = this.metadataForm.value;
    if (!values.titulo) {
      this.metadataForm.get('titulo')?.markAsTouched();
      this.toast.warn('Indica al menos el titulo para guardar el borrador.');
      return;
    }

    const version = this.state.getVersion();
    this.scorm
      .crearProyecto({
        id_usuario: userId,
        titulo: values.titulo,
        descripcion: values.descripcion,
        version_scorm: version,
        estado: 'borrador',
        tracking_preset_default: values.trackingPresetDefault,
        tracking_auto_default: values.trackingAutoDefault,
        tracking_min_seconds_default: Math.max(0, Number(values.trackingMinMinutesDefault || 0) * 60),
        tracking_media_ratio_default: Number(values.trackingMediaRatioDefault || 0.85),
      })
      .subscribe({
        next: (proyecto) => {
          const projectId = proyecto.id_proyecto;
          this.state.setProjectId(projectId);

          const crearMetadata = (portadaRuta: string | null, onDone: () => void) => {
            this.scorm
              .crearMetadata({
                id_proyecto: projectId,
                idioma: values.idioma || 'es',
                autor_principal: values.autor,
                organizacion: values.organizacion,
                entidad_publicadora: values.entidadPublicadora,
                descripcion_detallada: values.descripcion,
                portada_ruta: portadaRuta || undefined,
              })
              .subscribe({
                next: () => onDone(),
                error: () => {
                  this.toast.warn('No se pudo guardar la metadata del borrador.');
                  onDone();
                },
              });
          };

          const crearManifestYOrg = () => {
            const manifestId = `MANIFEST_${projectId}`;
            this.scorm
              .crearManifest({
                id_proyecto: projectId,
                identificador: manifestId,
                version: '1.0',
              })
              .subscribe({
                next: (manifest) => {
                  this.state.setManifestId(manifest.id_manifest);
                  this.scorm
                    .crearOrganizacion({
                      id_manifest: manifest.id_manifest,
                      identificador: `ORG_${projectId}`,
                      titulo: values.titulo,
                      es_principal: 1,
                    })
                    .subscribe({
                      next: (org) => {
                        this.state.setOrganizationId(org.id_organizacion);
                        this.finalizarBorrador();
                      },
                      error: () => this.finalizarBorrador(),
                    });
                },
                error: () => this.finalizarBorrador(),
              });
          };

          if (this.coverFile) {
            this.scorm.subirArchivo(projectId, null, this.coverFile).subscribe({
              next: (archivo) => crearMetadata(archivo.nombre_fisico, crearManifestYOrg),
              error: () => {
                this.toast.warn('No se pudo subir la portada. Se guardara sin imagen.');
                crearMetadata(null, crearManifestYOrg);
              },
            });
          } else {
            crearMetadata(null, crearManifestYOrg);
          }
        },
        error: () => this.toast.error('No se pudo guardar el borrador.'),
      });
  }

  private marcarProyectoComoBorrador(projectId: number) {
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
            next: () => this.finalizarBorrador(),
            error: () => this.toast.error('No se pudo guardar el borrador.'),
          });
      },
      error: () => this.toast.error('No se pudo guardar el borrador.'),
    });
  }

  private finalizarBorrador() {
    this.toast.success('Borrador guardado.');
    this.state.clearProjectData();
    this.router.navigate(['/history']);
  }

  onSubmitMetadata() {
    if (!this.metadataForm.valid) {
      this.metadataForm.markAllAsTouched();
      this.toast.warn('Completa los campos obligatorios antes de continuar.');
      return;
    }

    const userId = this.state.getUserId();
    if (!userId) {
      this.toast.warn('Debes iniciar sesion para continuar.');
      this.router.navigate(['/home']);
      return;
    }

    const values = this.metadataForm.value;
    const version = this.state.getVersion();

    this.scorm
      .crearProyecto({
        id_usuario: userId,
        titulo: values.titulo,
        descripcion: values.descripcion,
        version_scorm: version,
        estado: 'en_edicion',
        tracking_preset_default: values.trackingPresetDefault,
        tracking_auto_default: values.trackingAutoDefault,
        tracking_min_seconds_default: Math.max(0, Number(values.trackingMinMinutesDefault || 0) * 60),
        tracking_media_ratio_default: Number(values.trackingMediaRatioDefault || 0.85),
      })
      .subscribe({
        next: (proyecto) => {
          const projectId = proyecto.id_proyecto;
          this.state.setProjectId(projectId);

          const crearMetadata = (portadaRuta: string | null, onDone: () => void) => {
            this.scorm
              .crearMetadata({
                id_proyecto: projectId,
                idioma: values.idioma,
                autor_principal: values.autor,
                organizacion: values.organizacion,
                entidad_publicadora: values.entidadPublicadora,
                descripcion_detallada: values.descripcion,
                portada_ruta: portadaRuta || undefined,
              })
              .subscribe({
                next: () => onDone(),
                error: () => {
                  this.toast.error('No se pudo guardar la metadata.');
                },
              });
          };

          const crearManifestYOrg = () => {
            const manifestId = `MANIFEST_${projectId}`;
            this.scorm
              .crearManifest({
                id_proyecto: projectId,
                identificador: manifestId,
                version: '1.0',
              })
              .subscribe({
                next: (manifest) => {
                  this.state.setManifestId(manifest.id_manifest);
                  this.scorm
                    .crearOrganizacion({
                      id_manifest: manifest.id_manifest,
                      identificador: `ORG_${projectId}`,
                      titulo: values.titulo,
                      es_principal: 1,
                    })
                    .subscribe({
                      next: (org) => {
                        this.state.setOrganizationId(org.id_organizacion);
                        this.router.navigate(['/validation']);
                      },
                      error: () => this.toast.error('Error al crear organizacion.'),
                    });
                },
                error: () => this.toast.error('Error al crear manifest.'),
              });
          };

          if (this.coverFile) {
            this.scorm.subirArchivo(projectId, null, this.coverFile).subscribe({
              next: (archivo) => crearMetadata(archivo.nombre_fisico, crearManifestYOrg),
              error: () => {
                this.toast.warn('No se pudo subir la portada. Se guardara sin imagen.');
                crearMetadata(null, crearManifestYOrg);
              },
            });
          } else {
            crearMetadata(null, crearManifestYOrg);
          }
        },
        error: () => {
          this.toast.error('Error al crear proyecto.');
        },
      });
  }
}
