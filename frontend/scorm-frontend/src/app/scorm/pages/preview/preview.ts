import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ScormService } from '../../../services/scorm.service';
import { ScormStateService } from '../../../services/scorm-state.service';
import { ScormNavComponent } from '../../components/scorm-nav/scorm-nav';
import { ToastService } from '../../../shared/toast/toast.service';

interface LeccionResumen {
  id: number;
  codigo: string;
  nombre: string;
  tipo: string;
  recursos: string[];
}

interface ModuloResumen {
  id: number;
  nombre: string;
  codigo: string;
  lecciones: LeccionResumen[];
}

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, ScormNavComponent],
  templateUrl: './preview.html',
  styleUrls: ['./preview.scss'],
})
export class PreviewComponent implements OnInit {
  private scorm = inject(ScormService);
  private state = inject(ScormStateService);
  private router = inject(Router);
  private toast = inject(ToastService);

  proyecto: any = null;
  metadata: any = null;
  modulos: ModuloResumen[] = [];
  recursos: any[] = [];
  versionLabel = '1.2';
  scormGenerado = false;
  validacion: { valido: boolean; errores: string[]; warnings: string[] } | null = null;
  auditoria: { valido: boolean; errores: string[]; warnings: string[] } | null = null;
  validando = false;
  auditando = false;
  zipName = '';

  ngOnInit() {
    const projectId = this.state.getProjectId();
    const manifestId = this.state.getManifestId();
    const orgId = this.state.getOrganizationId();
    const version = this.state.getVersion();
    this.versionLabel = version.startsWith('2004') ? '2004' : '1.2';
    if (!projectId || !manifestId || !orgId) {
      this.toast.warn('No hay proyecto activo.');
      this.router.navigate(['/metadata']);
      return;
    }

    this.scorm.obtenerProyecto(projectId).subscribe({
      next: (proyecto) => (this.proyecto = proyecto),
    });

    this.scorm.listarMetadata(projectId).subscribe({
      next: (metadataList) => {
        this.metadata = metadataList && metadataList.length ? metadataList[0] : null;
      },
    });

    this.scorm.listarModulos(projectId).subscribe({
      next: (modulos) => {
        const resumen: ModuloResumen[] = modulos.map((mod: any) => ({
          id: mod.id_modulo,
          nombre: mod.nombre_modulo,
          codigo: mod.codigo_modulo || `MOD-${mod.id_modulo}`,
          lecciones: [],
        }));

        this.scorm.listarRecursos(manifestId).subscribe({
          next: (recursos: any[]) => {
            this.recursos = recursos || [];
            const recursosMap: Record<number, string> = {};
            recursos.forEach((recurso) => {
              recursosMap[recurso.id_recurso] = recurso.href || recurso.identificador;
            });

            this.scorm.listarItems(orgId).subscribe({
              next: (items: any[]) => {
                const recursosPorLeccion: Record<number, string[]> = {};
                items.forEach((item) => {
                  if (!item.id_leccion || !item.id_recurso) return;
                  if (!recursosPorLeccion[item.id_leccion]) {
                    recursosPorLeccion[item.id_leccion] = [];
                  }
                  const nombreRecurso = recursosMap[item.id_recurso] || `RES-${item.id_recurso}`;
                  recursosPorLeccion[item.id_leccion].push(nombreRecurso);
                });

                resumen.forEach((mod) => {
                  this.scorm.listarLecciones(mod.id).subscribe({
                    next: (lecciones) => {
                      mod.lecciones = lecciones.map((lec: any) => ({
                        id: lec.id_leccion,
                        codigo: lec.codigo_leccion || `LEC-${lec.id_leccion}`,
                        nombre: lec.nombre_leccion,
                        tipo: lec.tipo_leccion,
                        recursos: recursosPorLeccion[lec.id_leccion] || [],
                      }));
                    },
                  });
                });

                this.modulos = resumen;
              },
            });
          },
        });
      },
    });
  }

  volver() {
    this.router.navigate(['/resources']);
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

  generarScorm() {
    const projectId = this.state.getProjectId();
    if (!projectId) {
      this.toast.warn('No hay proyecto activo.');
      return;
    }

    this.validando = true;
    this.scorm.validarScorm(projectId).subscribe({
      next: (resultado) => {
        this.validacion = resultado;
        this.validando = false;
        if (!resultado.valido) {
          this.toast.warn('Hay errores de validacion. Revisa la lista antes de generar.');
          return;
        }
        this.generarScormZip(projectId);
      },
      error: () => {
        this.validando = false;
        this.toast.error('No se pudo validar el proyecto.');
      },
    });
  }

  auditarScorm() {
    const projectId = this.state.getProjectId();
    if (!projectId) {
      this.toast.warn('No hay proyecto activo.');
      return;
    }
    this.auditando = true;
    this.scorm.auditarScorm(projectId).subscribe({
      next: (resultado) => {
        this.auditoria = resultado;
        this.auditando = false;
      },
      error: () => {
        this.auditando = false;
        this.toast.error('No se pudo auditar el proyecto.');
      },
    });
  }

  private generarScormZip(projectId: number) {
    const version = this.state.getVersion();
    const generar$ =
      version.startsWith('2004') ? this.scorm.generarScorm2004(projectId) : this.scorm.generarScorm(projectId);

    generar$.subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = this.buildZipName(projectId, version);
        link.click();
        window.URL.revokeObjectURL(url);
        this.scormGenerado = true;
      },
      error: () => this.toast.error('Error al generar SCORM.'),
    });
  }

  finalizar() {
    this.state.clearProjectData();
    this.router.navigate(['/layout']);
  }

  private buildZipName(projectId: number, version: string | null) {
    const base = (this.zipName || '').trim();
    const safe = base
      ? base.replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 80)
      : '';
    if (safe) {
      return safe.toLowerCase().endsWith('.zip') ? safe : `${safe}.zip`;
    }
    return version && version.startsWith('2004') ? `scorm2004_${projectId}.zip` : `scorm_${projectId}.zip`;
  }
}
