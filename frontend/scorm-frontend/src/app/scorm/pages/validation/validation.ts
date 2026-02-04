import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ScormStateService } from '../../../services/scorm-state.service';
import { ScormService } from '../../../services/scorm.service';
import { ScormNavComponent } from '../../components/scorm-nav/scorm-nav';
import { ToastService } from '../../../shared/toast/toast.service';

@Component({
  standalone: true,
  templateUrl: './validation.html',
  styleUrls: ['./validation.scss'],
  imports: [ScormNavComponent]
})
export class ValidationComponent {
  private router = inject(Router);
  private state = inject(ScormStateService);
  private scorm = inject(ScormService);
  private toast = inject(ToastService);

  volver() {
    this.router.navigate(['/metadata']);
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

  seleccionarVersion(version: '1.2' | '2004') {
    const projectId = this.state.getProjectId();
    const versionValue = version === '2004' ? '2004_4th' : '1.2';
    this.state.setVersion(versionValue);

    if (projectId) {
      const titulo = 'Proyecto SCORM';
      this.scorm.obtenerProyecto(projectId).subscribe({
        next: (proyecto) => {
          this.scorm.actualizarProyecto(projectId, {
            titulo: proyecto.titulo || titulo,
            descripcion: proyecto.descripcion || '',
            version_scorm: versionValue,
            estado: proyecto.estado || 'en_edicion',
          }).subscribe({
            next: () => this.router.navigate(['/organizations']),
            error: () => this.router.navigate(['/organizations']),
          });
        },
        error: () => this.router.navigate(['/organizations']),
      });
    } else {
      this.router.navigate(['/organizations']);
    }
  }
}
