import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ScormService } from '../../../services/scorm.service';
import { ScormStateService } from '../../../services/scorm-state.service';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './import.html',
  styleUrls: ['./import.scss'],
})
export class ImportComponent {
  private fb = inject(FormBuilder);
  private scorm = inject(ScormService);
  private state = inject(ScormStateService);
  private router = inject(Router);

  form: FormGroup = this.fb.group({
    manifest: [null, Validators.required],
    archivoMap: [''],
    dryRun: [true],
  });

  zipForm: FormGroup = this.fb.group({
    zip: [null, Validators.required],
    zipDryRun: [true],
    crearProyecto: [false],
    titulo: [''],
    descripcion: [''],
  });

  resultado: any = null;
  resultadoZip: any = null;
  cargando = false;
  cargandoZip = false;

  onFileSelected(event: any) {
    const file: File = event.target.files?.[0];
    if (!file) return;
    this.form.patchValue({ manifest: file });
  }

  onZipSelected(event: any) {
    const file: File = event.target.files?.[0];
    if (!file) return;
    this.zipForm.patchValue({ zip: file });
  }

  importar() {
    const projectId = this.state.getProjectId();
    if (!projectId) {
      alert('No hay proyecto activo.');
      return;
    }

    const file = this.form.value.manifest;
    if (!file) {
      alert('Selecciona un imsmanifest.xml');
      return;
    }

    const archivoMap = this.form.value.archivoMap?.trim();
    this.cargando = true;
    this.scorm
      .importarManifest(projectId, file, {
        dryRun: this.form.value.dryRun,
        archivoMap: archivoMap || undefined,
      })
      .subscribe({
        next: (resp) => {
          this.resultado = resp;
          this.cargando = false;
          if (!resp.valido && this.form.value.dryRun) {
            alert('Hay errores en el manifest. Revisa la lista.');
          }
        },
        error: () => {
          this.cargando = false;
          alert('Error al importar el manifest.');
        },
      });
  }

  importarZip() {
    const projectId = this.state.getProjectId();
    const crearProyecto = Boolean(this.zipForm.value.crearProyecto);
    if (!projectId && !crearProyecto) {
      alert('No hay proyecto activo.');
      return;
    }
    if (crearProyecto && !this.state.getUserId()) {
      alert('Necesitas un usuario activo para crear el proyecto.');
      return;
    }

    const file = this.zipForm.value.zip;
    if (!file) {
      alert('Selecciona un ZIP SCORM.');
      return;
    }

    this.cargandoZip = true;
    const formData: any = { dryRun: this.zipForm.value.zipDryRun };
    if (crearProyecto) {
      formData.crearProyecto = true;
      formData.titulo = this.zipForm.value.titulo;
      formData.descripcion = this.zipForm.value.descripcion;
      formData.id_usuario = this.state.getUserId();
    }

    this.scorm
      .importarZip(projectId || 0, file, formData)
      .subscribe({
        next: (resp) => {
          this.resultadoZip = resp;
          this.cargandoZip = false;
          if (!resp.valido && this.zipForm.value.zipDryRun) {
            alert('Hay errores en el ZIP. Revisa la lista.');
          }
          if (resp.id_proyecto && resp.id_manifest && resp.id_organizacion_principal) {
            this.state.setProjectId(resp.id_proyecto);
            this.state.setManifestId(resp.id_manifest);
            this.state.setOrganizationId(resp.id_organizacion_principal);
            this.state.setVersion('1.2');
            this.router.navigate(['/organizations']);
          }
        },
        error: () => {
          this.cargandoZip = false;
          alert('Error al importar el ZIP.');
        },
      });
  }

  volver() {
    const projectId = this.state.getProjectId();
    this.router.navigate([projectId ? '/resources' : '/layout']);
  }
}
