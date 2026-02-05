import { Component, ElementRef, Input, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ScormStateService } from '../../../services/scorm-state.service';
import { ScormService } from '../../../services/scorm.service';
import { ToastService } from '../../../shared/toast/toast.service';

type StepKey = 'metadata' | 'organizations' | 'resources' | 'preview' | 'validation';

interface PrimaryLink {
  label: string;
  path: string;
  exact?: boolean;
}

interface StepLink {
  key: StepKey;
  label: string;
  path: string;
  index: string;
}

@Component({
  selector: 'app-scorm-nav',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './scorm-nav.html',
  styleUrls: ['./scorm-nav.scss'],
})
export class ScormNavComponent {
  private router = inject(Router);
  private state = inject(ScormStateService);
  private scorm = inject(ScormService);
  private toast = inject(ToastService);

  @Input() activeStep: StepKey | null = null;
  @Input() showStepper = false;
  @ViewChild('zipInput') zipInput?: ElementRef<HTMLInputElement>;

  primaryLinks: PrimaryLink[] = [
    { label: 'Panel', path: '/layout', exact: true },
    { label: 'Crear paquete', path: '/metadata' },
    { label: 'Historial', path: '/history' },
    { label: 'Secuenciacion', path: '/sequencing' },
  ];

  steps: StepLink[] = [
    { key: 'metadata', label: 'Metadatos', path: '/metadata', index: '01' },
    { key: 'validation', label: 'Validacion', path: '/validation', index: '02' },
    { key: 'organizations', label: 'Organizacion', path: '/organizations', index: '03' },
    { key: 'resources', label: 'Recursos', path: '/resources', index: '04' },
    { key: 'preview', label: 'Vista previa', path: '/preview', index: '05' },
  ];

  isStepDone(key: StepKey) {
    if (!this.activeStep) return false;
    const order = this.steps.map((step) => step.key);
    return order.indexOf(key) < order.indexOf(this.activeStep);
  }

  onExit() {
    this.state.clearProjectData();
    this.router.navigate(['/home']);
  }

  seleccionarZip() {
    this.zipInput?.nativeElement.click();
  }

  onZipSelected(event: any) {
    const file: File | undefined = event?.target?.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const limiteMB = 500;
    if (ext !== 'zip') {
      this.toast.warn('Selecciona un archivo ZIP valido.');
      event.target.value = '';
      return;
    }
    if (file.size > limiteMB * 1024 * 1024) {
      this.toast.warn(`El ZIP supera el limite de ${limiteMB}MB.`);
      event.target.value = '';
      return;
    }

    const userId = this.state.getUserId();
    if (!userId) {
      this.toast.warn('Debes iniciar sesion para importar.');
      this.router.navigate(['/home']);
      return;
    }

    this.toast.info('Importando paquete...');
    this.scorm.importarPaquete(file, userId).subscribe({
      next: (resp) => {
        if (resp?.id_proyecto) {
          this.state.setProjectId(resp.id_proyecto);
        }
        if (resp?.id_manifest) {
          this.state.setManifestId(resp.id_manifest);
        }
        if (resp?.id_organizacion) {
          this.state.setOrganizationId(resp.id_organizacion);
        }
        if (resp?.version_scorm) {
          this.state.setVersion(resp.version_scorm);
        }
        if (Array.isArray(resp?.warnings) && resp.warnings.length) {
          this.toast.warn(`Importado con ${resp.warnings.length} advertencias.`);
        } else {
          this.toast.success('Paquete importado correctamente.');
        }
        this.router.navigate(['/organizations']);
      },
      error: () => this.toast.error('No se pudo importar el paquete.'),
    });
  }

  get visibleLinks() {
    const version = this.state.getVersion();
    const allowSequencing = version.startsWith('2004');
    return this.primaryLinks.filter((link) => {
      if (link.path === '/sequencing') {
        return allowSequencing;
      }
      return true;
    });
  }
}
