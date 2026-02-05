import { Component, ElementRef, ViewChild, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ScormNavComponent } from '../../components/scorm-nav/scorm-nav';
import { ScormService } from '../../../services/scorm.service';
import { ScormStateService } from '../../../services/scorm-state.service';
import { ToastService } from '../../../shared/toast/toast.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [ScormNavComponent],
  templateUrl: './layout.html',
  styleUrls: ['./layout.scss'],
})
export class LayoutComponent {
  private router = inject(Router);
  private scorm = inject(ScormService);
  private state = inject(ScormStateService);
  private toast = inject(ToastService);

  @ViewChild('zipInput') zipInput?: ElementRef<HTMLInputElement>;



  crearPaquete(){
    //Va a la pantalla de crear paquetes
    this.router.navigate(['/metadata']);
  }

  historial(){
    //Va al historial de paquetes creados
    this.router.navigate(['/history']);
  }

  volver(){
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
}
