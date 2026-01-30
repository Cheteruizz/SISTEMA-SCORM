import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ScormService } from '../../../services/scorm.service';
import { ScormStateService } from '../../../services/scorm-state.service';
import { ScormNavComponent } from '../../components/scorm-nav/scorm-nav';

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

  pasoActual: Paso = 'explicacion';
  metadataForm: FormGroup;

  constructor() {
    this.metadataForm = this.fb.group({
      titulo: ['', Validators.required],
      descripcion: [''],
      idioma: ['es', Validators.required],
      autor: [''],
      organizacion: [''],
      entidadPublicadora: [''],
    });
  }

  cambiarPaso(nuevoPaso: Paso) {
    this.pasoActual = nuevoPaso;
  }

  volver() {
    this.router.navigate(['/layout']);
  }

  onSubmitMetadata() {
    if (!this.metadataForm.valid) {
      this.metadataForm.markAllAsTouched();
      alert('Completa los campos obligatorios antes de continuar.');
      return;
    }

    const userId = this.state.getUserId();
    if (!userId) {
      alert('Debes iniciar sesion para continuar.');
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
      })
      .subscribe({
        next: (proyecto) => {
          const projectId = proyecto.id_proyecto;
          this.state.setProjectId(projectId);

          this.scorm
            .crearMetadata({
              id_proyecto: projectId,
              idioma: values.idioma,
              autor_principal: values.autor,
              organizacion: values.organizacion,
              entidad_publicadora: values.entidadPublicadora,
              descripcion_detallada: values.descripcion,
            })
            .subscribe();

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
                    error: () => alert('Error al crear organizacion.'),
                  });
              },
              error: () => alert('Error al crear manifest.'),
            });
        },
        error: () => {
          alert('Error al crear proyecto.');
        },
      });
  }
}
