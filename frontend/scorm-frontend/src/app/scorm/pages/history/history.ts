import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ScormService } from '../../../services/scorm.service';
import { ScormStateService } from '../../../services/scorm-state.service';
import { ToastService } from '../../../shared/toast/toast.service';

@Component({
  standalone: true,
  imports: [CommonModule],
  templateUrl: './history.html',
  styleUrls: ['./history.scss'],
})
export class HistoryComponent implements OnInit {
  private router = inject(Router);
  private scorm = inject(ScormService);
  private state = inject(ScormStateService);
  private toast = inject(ToastService);

  proyectos: any[] = [];
  paquetesPorProyecto: Record<number, any[]> = {};
  cargando = true;
  error = '';

  volver() {
    this.router.navigate(['/layout']);
  }

  ngOnInit() {
    const userId = this.state.getUserId();
    if (!userId) {
      this.error = 'Debes iniciar sesion para ver el historial.';
      this.cargando = false;
      return;
    }

    this.scorm.listarProyectos().subscribe({
      next: (proyectos: any[]) => {
        const propios = (proyectos || []).filter((p) => p.id_usuario === userId);
        this.proyectos = propios;
        if (!propios.length) {
          this.cargando = false;
          return;
        }

        let pendientes = propios.length;
        propios.forEach((proyecto) => {
          this.scorm.listarPaquetes(proyecto.id_proyecto).subscribe({
            next: (paquetes: any[]) => {
              this.paquetesPorProyecto[proyecto.id_proyecto] = paquetes || [];
            },
            error: () => {
              this.paquetesPorProyecto[proyecto.id_proyecto] = [];
            },
            complete: () => {
              pendientes -= 1;
              if (pendientes === 0) {
                this.cargando = false;
              }
            },
          });
        });
      },
      error: () => {
        this.error = 'Error al cargar historial.';
        this.cargando = false;
      },
    });
  }

  editarProyecto(proyecto: any) {
    const projectId = proyecto?.id_proyecto;
    if (!projectId) {
      this.toast.warn('Proyecto invalido.');
      return;
    }

    this.scorm.listarManifests(projectId).subscribe({
      next: (manifests: any[]) => {
        const manifest = (manifests || [])[0];
        if (!manifest) {
          this.toast.error('No se encontro manifest para el proyecto.');
          return;
        }

        this.scorm.listarOrganizaciones(manifest.id_manifest).subscribe({
          next: (orgs: any[]) => {
            const principal = (orgs || []).find((o) => o.es_principal === 1) || (orgs || [])[0];
            if (!principal) {
              this.toast.error('No se encontro organizacion para el proyecto.');
              return;
            }

            this.state.setProjectId(projectId);
            this.state.setManifestId(manifest.id_manifest);
            this.state.setOrganizationId(principal.id_organizacion);
            if (proyecto.version_scorm) {
              this.state.setVersion(proyecto.version_scorm);
              this.router.navigate(['/organizations']);
              return;
            }
            this.state.setVersion('1.2');
            this.router.navigate(['/validation']);
          },
          error: () => this.toast.error('No se pudieron cargar las organizaciones.'),
        });
      },
      error: () => this.toast.error('No se pudieron cargar los manifests.'),
    });
  }

  eliminarProyecto(proyecto: any) {
    const projectId = proyecto?.id_proyecto;
    if (!projectId) {
      this.toast.warn('Proyecto invalido.');
      return;
    }
    const nombre = proyecto?.titulo || 'este proyecto';
    if (!confirm(`Eliminar ${nombre}? Esta accion no se puede deshacer.`)) return;

    this.scorm.eliminarProyecto(projectId).subscribe({
      next: () => {
        this.proyectos = this.proyectos.filter((p) => p.id_proyecto !== projectId);
        delete this.paquetesPorProyecto[projectId];
        this.toast.success('Proyecto eliminado.');
      },
      error: () => this.toast.error('No se pudo eliminar el proyecto.'),
    });
  }
}
