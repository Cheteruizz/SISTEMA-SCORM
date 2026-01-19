import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ScormService } from '../../../services/scorm.service';
import { ScormStateService } from '../../../services/scorm-state.service';

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
  imports: [CommonModule],
  templateUrl: './preview.html',
  styleUrls: ['./preview.scss'],
})
export class PreviewComponent implements OnInit {
  private scorm = inject(ScormService);
  private state = inject(ScormStateService);
  private router = inject(Router);

  proyecto: any = null;
  metadata: any = null;
  modulos: ModuloResumen[] = [];
  versionLabel = '1.2';
  scormGenerado = false;
  validacion: { valido: boolean; errores: string[]; warnings: string[] } | null = null;
  validando = false;

  ngOnInit() {
    const projectId = this.state.getProjectId();
    const manifestId = this.state.getManifestId();
    const orgId = this.state.getOrganizationId();
    const version = this.state.getVersion();
    this.versionLabel = version === '2004_4th' ? '2004' : '1.2';
    if (!projectId || !manifestId || !orgId) {
      alert('No hay proyecto activo.');
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

  generarScorm() {
    const projectId = this.state.getProjectId();
    if (!projectId) {
      alert('No hay proyecto activo.');
      return;
    }

    this.validando = true;
    this.scorm.validarScorm(projectId).subscribe({
      next: (resultado) => {
        this.validacion = resultado;
        this.validando = false;
        if (!resultado.valido) {
          alert('Hay errores de validacion. Revisa la lista antes de generar.');
          return;
        }
        this.generarScormZip(projectId);
      },
      error: () => {
        this.validando = false;
        alert('No se pudo validar el proyecto.');
      },
    });
  }

  private generarScormZip(projectId: number) {
    const version = this.state.getVersion();
    const generar$ =
      version === '2004_4th' ? this.scorm.generarScorm2004(projectId) : this.scorm.generarScorm(projectId);

    generar$.subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = version === '2004_4th' ? `scorm2004_${projectId}.zip` : `scorm_${projectId}.zip`;
        link.click();
        window.URL.revokeObjectURL(url);
        this.scormGenerado = true;
      },
      error: () => alert('Error al generar SCORM.'),
    });
  }

  finalizar() {
    this.state.clearProjectData();
    this.router.navigate(['/layout']);
  }
}
