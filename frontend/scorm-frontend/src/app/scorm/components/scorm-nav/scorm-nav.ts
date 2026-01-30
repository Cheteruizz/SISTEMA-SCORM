import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ScormStateService } from '../../../services/scorm-state.service';

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

  @Input() activeStep: StepKey | null = null;
  @Input() showStepper = false;

  primaryLinks: PrimaryLink[] = [
    { label: 'Panel', path: '/layout', exact: true },
    { label: 'Crear paquete', path: '/metadata' },
    { label: 'Historial', path: '/history' },
    { label: 'Importar', path: '/importar' },
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

  onImportClick() {
    const current = this.router.url || '/layout';
    this.state.setImportReturn(current);
  }

  onExit() {
    this.state.clearProjectData();
    this.state.clearImportReturn();
    this.router.navigate(['/home']);
  }
}
