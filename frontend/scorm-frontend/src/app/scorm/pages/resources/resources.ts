import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ScormService } from '../../../services/scorm.service';
import { ScormStateService } from '../../../services/scorm-state.service';

interface LeccionOption {
  id_leccion: number;
  id_modulo: number;
  label: string;
}

@Component({
  selector: 'app-resources',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './resources.html',
  styleUrls: ['./resources.scss'],
})
export class ResourcesComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private scorm = inject(ScormService);
  private state = inject(ScormStateService);

  recursosForm: FormGroup;
  archivoSeleccionado: File | null = null;
  lecciones: LeccionOption[] = [];
  moduloItemMap: Record<number, number> = {};

  constructor() {
    this.recursosForm = this.fb.group({
      nombreArchivo: ['', Validators.required],
      idArchivo: [''],
      idLeccion: ['', Validators.required],
      tipoArchivo: ['', Validators.required],
    });
  }

  ngOnInit() {
    const projectId = this.state.getProjectId();
    if (!projectId) {
      alert('No hay proyecto activo.');
      this.router.navigate(['/metadata']);
      return;
    }

    this.scorm.listarModulos(projectId).subscribe({
      next: (modulos: any[]) => {
        modulos.forEach((mod) => {
          this.scorm.listarLecciones(mod.id_modulo).subscribe({
            next: (lecciones: any[]) => {
              lecciones.forEach((lec) => {
                this.lecciones.push({
                  id_leccion: lec.id_leccion,
                  id_modulo: mod.id_modulo,
                  label: `${lec.codigo_leccion || lec.id_leccion} - ${lec.nombre_leccion}`,
                });
              });
            },
          });
        });
      },
    });

    const orgId = this.state.getOrganizationId();
    if (orgId) {
      this.scorm.listarItems(orgId).subscribe({
        next: (items: any[]) => {
          items
            .filter((item) => item.tipo_item === 'modulo')
            .forEach((item) => {
              this.moduloItemMap[item.id_modulo] = item.id_item;
            });
        },
      });
    }
  }

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (!file) return;

    const limiteMB = 100;
    const limiteBytes = limiteMB * 1024 * 1024;
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const extensionesPermitidas = [
      'pdf',
      'jpg',
      'jpeg',
      'png',
      'gif',
      'mp4',
      'avi',
      'mov',
      'doc',
      'docx',
      'txt',
      'zip',
      'rar',
      'scorm',
      'html',
    ];

    if (file.size > limiteBytes) {
      alert('El archivo supera el limite de 100MB.');
      event.target.value = '';
      return;
    }

    if (!extensionesPermitidas.includes(ext)) {
      alert('Formato no soportado.');
      event.target.value = '';
      return;
    }

    this.archivoSeleccionado = file;
    this.recursosForm.patchValue({
      nombreArchivo: file.name,
      tipoArchivo: ext.toUpperCase(),
    });
  }

  volver() {
    this.router.navigate(['/organizations']);
  }

  irAVistaPrevia() {
    this.router.navigate(['/preview']);
  }

  subirArchivo() {
    if (!this.recursosForm.valid || !this.archivoSeleccionado) {
      alert('Completa los campos y selecciona un archivo.');
      return;
    }

    const projectId = this.state.getProjectId();
    const manifestId = this.state.getManifestId();
    const orgId = this.state.getOrganizationId();
    if (!projectId || !manifestId || !orgId) {
      alert('No hay proyecto activo.');
      return;
    }

    const idLeccion = Number(this.recursosForm.value.idLeccion);
    const leccion = this.lecciones.find((lec) => lec.id_leccion === idLeccion);
    const parentItemId = leccion ? this.moduloItemMap[leccion.id_modulo] : null;

    this.scorm.subirArchivo(projectId, idLeccion, this.archivoSeleccionado).subscribe({
      next: (archivo) => {
        const recursoId = `RES_${Date.now()}`;
        const itemId = `ITEM_${Date.now()}`;

        this.scorm
          .crearRecurso({
            id_manifest: manifestId,
            id_archivo: archivo.id_archivo,
            identificador: recursoId,
            href: archivo.nombre_fisico,
            tipo_recurso: 'webcontent',
            scorm_type: 'sco',
          })
          .subscribe({
            next: (recurso) => {
              this.scorm
                .crearItem({
                  id_organizacion: orgId,
                  id_padre: parentItemId || null,
                  identificador: itemId,
                  titulo: this.recursosForm.value.nombreArchivo,
                  tipo_item: 'sco',
                  orden: 1,
                  es_lanzable: 1,
                  id_leccion: idLeccion,
                  id_recurso: recurso.id_recurso,
                })
                .subscribe({
                  next: () => {
                    alert('Archivo subido correctamente.');
                    this.recursosForm.reset();
                    this.archivoSeleccionado = null;
                  },
                  error: () => alert('Error al crear item.'),
                });
            },
            error: () => alert('Error al crear recurso.'),
          });
      },
      error: () => alert('Error al subir archivo.'),
    });
  }

  eliminarArchivo() {
    this.recursosForm.reset();
    this.archivoSeleccionado = null;
  }
}
