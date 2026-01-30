import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ScormService } from '../../../services/scorm.service';
import { ScormStateService } from '../../../services/scorm-state.service';
import { ScormNavComponent } from '../../components/scorm-nav/scorm-nav';

interface Leccion {
  id_leccion: number;
  nombre: string;
  codigo: string;
  tipo: string;
}

interface Modulo {
  id_modulo: number;
  nombre: string;
  codigo: string;
  descripcion?: string;
  duracion?: number | null;
  item_id?: number | null;
  lecciones: Leccion[];
}

@Component({
  selector: 'app-modulos',
  standalone: true,
  imports: [CommonModule, FormsModule, ScormNavComponent],
  templateUrl: './organizations.html',
  styleUrls: ['./organizations.scss'],
})
export class OrganizationsComponent implements OnInit {
  private scorm = inject(ScormService);
  private state = inject(ScormStateService);
  private router = inject(Router);

  modulos: Modulo[] = [];
  vistaActual: 'creacion' | 'lista' | 'lecciones' = 'creacion';
  moduloActual: Modulo | null = null;

  nuevoModulo: Partial<Modulo> = {
    nombre: '',
    codigo: '',
    descripcion: '',
    duracion: null,
  };

  nuevaLeccion: { codigo: string; nombre: string; tipo: string } = {
    codigo: '',
    nombre: '',
    tipo: '',
  };

  ngOnInit() {
    const projectId = this.state.getProjectId();
    const orgId = this.state.getOrganizationId();
    if (!projectId) {
      alert('Primero debes crear el proyecto.');
      this.router.navigate(['/metadata']);
      return;
    }

    this.scorm.listarModulos(projectId).subscribe({
      next: (modulos: any[]) => {
        const baseModulos = modulos.map((mod) => ({
          id_modulo: mod.id_modulo,
          nombre: mod.nombre_modulo,
          codigo: mod.codigo_modulo || `MOD-${mod.id_modulo}`,
          descripcion: mod.descripcion || '',
          duracion: mod.duracion_minutos || null,
          item_id: null,
          lecciones: [] as Leccion[],
        }));

        if (orgId) {
          this.scorm.listarItems(orgId).subscribe({
            next: (items: any[]) => {
              items
                .filter((item) => item.tipo_item === 'modulo')
                .forEach((item) => {
                  const mod = baseModulos.find((m) => m.id_modulo === item.id_modulo);
                  if (mod) {
                    mod.item_id = item.id_item;
                  }
                });

              baseModulos
                .filter((mod) => !mod.item_id)
                .forEach((mod) => {
                  this.scorm
                    .crearItem({
                      id_organizacion: orgId,
                      identificador: `MOD_ITEM_${mod.id_modulo}`,
                      titulo: mod.nombre,
                      tipo_item: 'modulo',
                      orden: 1,
                      es_lanzable: 0,
                      id_modulo: mod.id_modulo,
                    })
                    .subscribe({
                      next: (item) => {
                        mod.item_id = item.id_item;
                      },
                    });
                });
            },
          });
        }

        baseModulos.forEach((mod) => {
          this.scorm.listarLecciones(mod.id_modulo).subscribe({
            next: (lecciones: any[]) => {
              mod.lecciones = lecciones.map((lec) => ({
                id_leccion: lec.id_leccion,
                nombre: lec.nombre_leccion,
                codigo: lec.codigo_leccion || `LEC-${lec.id_leccion}`,
                tipo: lec.tipo_leccion,
              }));
            },
          });
        });

        this.modulos = baseModulos;
      },
    });
  }

  cambiarVista(destino: 'creacion' | 'lista' | 'lecciones') {
    this.vistaActual = destino;
  }

  gestionarLecciones(modulo: Modulo) {
    this.moduloActual = modulo;
    this.cambiarVista('lecciones');
  }

  irAtras() {
    if (this.vistaActual === 'lecciones') {
      this.moduloActual = null;
      this.cambiarVista('lista');
    } else if (this.vistaActual === 'lista') {
      this.cambiarVista('creacion');
    } else {
      this.router.navigate(['/metadata']);
    }
  }

  crearModulo() {
    const projectId = this.state.getProjectId();
    const orgId = this.state.getOrganizationId();
    if (!projectId) {
      alert('No hay proyecto activo.');
      return;
    }

    if (!this.nuevoModulo.nombre || !this.nuevoModulo.codigo) {
      alert('Rellena nombre e identificador.');
      return;
    }

    this.scorm
      .crearModulo({
        id_proyecto: projectId,
        nombre_modulo: this.nuevoModulo.nombre,
        descripcion: this.nuevoModulo.descripcion,
        duracion_minutos: this.nuevoModulo.duracion ? Number(this.nuevoModulo.duracion) : null,
        codigo_modulo: this.nuevoModulo.codigo,
      })
      .subscribe({
        next: (respuesta) => {
          const nuevo: Modulo = {
            id_modulo: respuesta.id_modulo,
            nombre: this.nuevoModulo.nombre as string,
            codigo: this.nuevoModulo.codigo as string,
            descripcion: this.nuevoModulo.descripcion || '',
            duracion: this.nuevoModulo.duracion ? Number(this.nuevoModulo.duracion) : null,
            item_id: null,
            lecciones: [],
          };

          if (orgId) {
            this.scorm
              .crearItem({
                id_organizacion: orgId,
                identificador: `MOD_ITEM_${respuesta.id_modulo}`,
                titulo: nuevo.nombre,
                tipo_item: 'modulo',
                orden: 1,
                es_lanzable: 0,
                id_modulo: respuesta.id_modulo,
              })
              .subscribe({
                next: (item) => {
                  nuevo.item_id = item.id_item;
                },
              });
          }

          this.modulos.push(nuevo);

          this.nuevoModulo = {
            nombre: '',
            codigo: '',
            descripcion: '',
            duracion: null,
          };
          alert('Modulo creado.');
        },
        error: () => alert('Error al crear modulo.'),
      });
  }

  crearLeccion() {
    if (!this.moduloActual) return;

    if (!this.nuevaLeccion.codigo || !this.nuevaLeccion.nombre || !this.nuevaLeccion.tipo) {
      alert('Rellena ID, nombre y tipo de la leccion.');
      return;
    }

    this.scorm
      .crearLeccion({
        id_modulo: this.moduloActual.id_modulo,
        nombre_leccion: this.nuevaLeccion.nombre,
        tipo_leccion: this.nuevaLeccion.tipo,
        codigo_leccion: this.nuevaLeccion.codigo,
      })
      .subscribe({
        next: (respuesta) => {
          this.moduloActual?.lecciones.push({
            id_leccion: respuesta.id_leccion,
            nombre: this.nuevaLeccion.nombre,
            codigo: this.nuevaLeccion.codigo,
            tipo: this.nuevaLeccion.tipo,
          });
          this.nuevaLeccion = { codigo: '', nombre: '', tipo: '' };
        },
        error: () => alert('Error al crear leccion.'),
      });
  }

  borrarLeccion(leccion: Leccion) {
    if (!confirm('Borrar leccion?')) return;
    this.scorm.eliminarLeccion(leccion.id_leccion).subscribe({
      next: () => {
        if (this.moduloActual) {
          this.moduloActual.lecciones = this.moduloActual.lecciones.filter(
            (lec) => lec.id_leccion !== leccion.id_leccion
          );
        }
      },
      error: () => alert('Error al eliminar leccion.'),
    });
  }

  irARecursos() {
    this.router.navigate(['/resources']);
  }
}
