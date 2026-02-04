import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ScormService } from '../../../services/scorm.service';
import { ScormStateService } from '../../../services/scorm-state.service';
import { ScormNavComponent } from '../../components/scorm-nav/scorm-nav';
import { ToastService } from '../../../shared/toast/toast.service';

interface Leccion {
  id_leccion: number;
  nombre: string;
  codigo: string;
  tipo: string;
  item_id?: number | null;
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
  private toast = inject(ToastService);

  modulos: Modulo[] = [];
  vistaActual: 'creacion' | 'lista' | 'lecciones' = 'creacion';
  moduloActual: Modulo | null = null;
  moduloActualId: number | null = null;
  autoModuloId = true;
  autoLeccionId = true;
  editModuloId: number | null = null;
  editModulo: { nombre: string; codigo: string } = { nombre: '', codigo: '' };
  editLeccionId: number | null = null;
  editLeccion: { nombre: string; codigo: string; tipo: string } = { nombre: '', codigo: '', tipo: '' };
  codigoModuloError: string | null = null;
  codigoLeccionError: string | null = null;
  codigoModuloEditError: string | null = null;
  codigoLeccionEditError: string | null = null;
  draggingModuloId: number | null = null;
  draggingLeccionId: number | null = null;

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

  private buildCodigo(prefix: string, name: string | undefined) {
    const base = String(name || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 20);
    const suffix = base || String(Date.now()).slice(-6);
    return `${prefix}_${suffix}`.toUpperCase();
  }

  private existeCodigoModulo(codigo: string, excluirId?: number) {
    const clean = String(codigo || '').trim().toLowerCase();
    if (!clean) return false;
    return this.modulos.some((m) => m.id_modulo !== excluirId && String(m.codigo || '').trim().toLowerCase() === clean);
  }

  private existeCodigoLeccion(codigo: string, excluirId?: number) {
    const clean = String(codigo || '').trim().toLowerCase();
    if (!clean || !this.moduloActual) return false;
    return this.moduloActual.lecciones.some(
      (l) => l.id_leccion !== excluirId && String(l.codigo || '').trim().toLowerCase() === clean
    );
  }

  validarCodigoModulo() {
    if (this.autoModuloId) {
      this.codigoModuloError = null;
      return;
    }
    const codigo = this.nuevoModulo.codigo || '';
    this.codigoModuloError = this.existeCodigoModulo(codigo) ? 'ID de modulo duplicado.' : null;
  }

  validarCodigoLeccion() {
    if (this.autoLeccionId) {
      this.codigoLeccionError = null;
      return;
    }
    const codigo = this.nuevaLeccion.codigo || '';
    this.codigoLeccionError = this.existeCodigoLeccion(codigo) ? 'ID de leccion duplicado.' : null;
  }

  validarCodigoModuloEdit(mod: Modulo) {
    const codigo = this.editModulo.codigo || '';
    this.codigoModuloEditError = this.existeCodigoModulo(codigo, mod.id_modulo) ? 'ID de modulo duplicado.' : null;
  }

  validarCodigoLeccionEdit(lec: Leccion) {
    const codigo = this.editLeccion.codigo || '';
    this.codigoLeccionEditError = this.existeCodigoLeccion(codigo, lec.id_leccion) ? 'ID de leccion duplicado.' : null;
  }

  ngOnInit() {
    const projectId = this.state.getProjectId();
    const orgId = this.state.getOrganizationId();
    if (!projectId) {
      this.toast.warn('Primero debes crear el proyecto.');
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
              const moduloItems = items.filter((item) => item.tipo_item === 'modulo');
              const leccionItems = items.filter((item) => item.tipo_item === 'leccion');
              moduloItems.forEach((item) => {
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

              baseModulos.forEach((mod) => {
                this.scorm.listarLecciones(mod.id_modulo).subscribe({
                  next: (lecciones: any[]) => {
                    mod.lecciones = lecciones.map((lec) => {
                      const item = leccionItems.find((it) => it.id_leccion === lec.id_leccion);
                      return {
                        id_leccion: lec.id_leccion,
                        nombre: lec.nombre_leccion,
                        codigo: lec.codigo_leccion || `LEC-${lec.id_leccion}`,
                        tipo: lec.tipo_leccion,
                        item_id: item ? item.id_item : null,
                      };
                    });
                  },
                });
              });
            },
          });
        } else {
          baseModulos.forEach((mod) => {
            this.scorm.listarLecciones(mod.id_modulo).subscribe({
              next: (lecciones: any[]) => {
                mod.lecciones = lecciones.map((lec) => ({
                  id_leccion: lec.id_leccion,
                  nombre: lec.nombre_leccion,
                  codigo: lec.codigo_leccion || `LEC-${lec.id_leccion}`,
                  tipo: lec.tipo_leccion,
                  item_id: null,
                }));
              },
            });
          });
        }

        this.modulos = baseModulos;
      },
    });
  }

  cambiarVista(destino: 'creacion' | 'lista' | 'lecciones') {
    this.vistaActual = destino;
  }

  gestionarLecciones(modulo: Modulo) {
    this.moduloActual = modulo;
    this.moduloActualId = modulo.id_modulo;
    this.cambiarVista('lecciones');
  }

  cambiarModulo(moduloId: number | null) {
    if (!moduloId) return;
    const mod = this.modulos.find((m) => m.id_modulo === Number(moduloId));
    if (mod) {
      this.moduloActual = mod;
      this.moduloActualId = mod.id_modulo;
    }
  }

  onDragStartModulo(mod: Modulo) {
    this.draggingModuloId = mod.id_modulo;
  }

  onDropModulo(target: Modulo) {
    if (!this.draggingModuloId || this.draggingModuloId === target.id_modulo) return;
    const fromIndex = this.modulos.findIndex((m) => m.id_modulo === this.draggingModuloId);
    const toIndex = this.modulos.findIndex((m) => m.id_modulo === target.id_modulo);
    if (fromIndex < 0 || toIndex < 0) return;
    const [moved] = this.modulos.splice(fromIndex, 1);
    this.modulos.splice(toIndex, 0, moved);
    this.persistOrdenModulos();
  }

  private persistOrdenModulos() {
    const orgId = this.state.getOrganizationId();
    if (!orgId) return;
    this.modulos.forEach((mod, index) => {
      if (!mod.item_id) return;
      this.scorm.actualizarItem(mod.item_id, {
        identificador: `MOD_ITEM_${mod.id_modulo}`,
        titulo: mod.nombre,
        tipo_item: 'modulo',
        orden: index + 1,
        es_lanzable: 0,
        id_modulo: mod.id_modulo,
      }).subscribe();
    });
  }

  iniciarEdicionModulo(mod: Modulo) {
    this.editModuloId = mod.id_modulo;
    this.editModulo = { nombre: mod.nombre, codigo: mod.codigo };
  }

  cancelarEdicionModulo() {
    this.editModuloId = null;
    this.editModulo = { nombre: '', codigo: '' };
  }

  guardarEdicionModulo(mod: Modulo) {
    if (!this.editModulo.nombre) {
      this.toast.warn('Rellena el nombre del modulo.');
      return;
    }
    this.validarCodigoModuloEdit(mod);
    if (this.codigoModuloEditError) {
      this.toast.warn(this.codigoModuloEditError);
      return;
    }
    const codigo = this.editModulo.codigo || this.buildCodigo('MOD', this.editModulo.nombre);
    this.scorm
      .actualizarModulo(mod.id_modulo, {
        nombre_modulo: this.editModulo.nombre,
        descripcion: mod.descripcion || '',
        duracion_minutos: mod.duracion || null,
        codigo_modulo: codigo,
      })
      .subscribe({
        next: () => {
          mod.nombre = this.editModulo.nombre;
          mod.codigo = codigo;
          this.actualizarItemModulo(mod.id_modulo, mod.nombre);
          this.cancelarEdicionModulo();
          this.toast.success('Modulo actualizado.');
        },
        error: () => this.toast.error('Error al actualizar modulo.'),
      });
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

  crearModulo() {
    const projectId = this.state.getProjectId();
    const orgId = this.state.getOrganizationId();
    if (!projectId) {
      this.toast.warn('No hay proyecto activo.');
      return;
    }

    if (!this.nuevoModulo.nombre) {
      this.toast.warn('Rellena el nombre del modulo.');
      return;
    }

    if (!this.nuevoModulo.codigo || this.autoModuloId) {
      this.nuevoModulo.codigo = this.buildCodigo('MOD', this.nuevoModulo.nombre);
    }
    this.validarCodigoModulo();
    if (this.codigoModuloError) {
      this.toast.warn(this.codigoModuloError);
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
          this.moduloActual = nuevo;
          this.moduloActualId = nuevo.id_modulo;
          this.cambiarVista('lecciones');

          this.nuevoModulo = {
            nombre: '',
            codigo: '',
            descripcion: '',
            duracion: null,
          };
          this.toast.success('Modulo creado.');
        },
        error: () => this.toast.error('Error al crear modulo.'),
      });
  }

  crearLeccion() {
    if (!this.moduloActual) return;

    if (!this.nuevaLeccion.nombre || !this.nuevaLeccion.tipo) {
      this.toast.warn('Rellena nombre y tipo de la leccion.');
      return;
    }

    if (!this.nuevaLeccion.codigo || this.autoLeccionId) {
      this.nuevaLeccion.codigo = this.buildCodigo('LEC', this.nuevaLeccion.nombre);
    }
    this.validarCodigoLeccion();
    if (this.codigoLeccionError) {
      this.toast.warn(this.codigoLeccionError);
      return;
    }

    const orgId = this.state.getOrganizationId();
    this.scorm
      .crearLeccion({
        id_modulo: this.moduloActual.id_modulo,
        nombre_leccion: this.nuevaLeccion.nombre,
        tipo_leccion: this.nuevaLeccion.tipo,
        codigo_leccion: this.nuevaLeccion.codigo,
      })
      .subscribe({
        next: (respuesta) => {
          const nueva: Leccion = {
            id_leccion: respuesta.id_leccion,
            nombre: this.nuevaLeccion.nombre,
            codigo: this.nuevaLeccion.codigo,
            tipo: this.nuevaLeccion.tipo,
            item_id: null,
          };
          this.moduloActual?.lecciones.push(nueva);
          this.nuevaLeccion = { codigo: '', nombre: '', tipo: '' };

          if (orgId && this.moduloActual?.item_id) {
            this.scorm
              .crearItem({
                id_organizacion: orgId,
                id_padre: this.moduloActual.item_id,
                identificador: `LEC_ITEM_${respuesta.id_leccion}`,
                titulo: nueva.nombre,
                tipo_item: 'leccion',
                orden: 1,
                es_lanzable: 0,
                id_leccion: respuesta.id_leccion,
              })
              .subscribe({
                next: (item) => {
                  nueva.item_id = item.id_item;
                },
              });
          }
        },
        error: () => this.toast.error('Error al crear leccion.'),
      });
  }

  iniciarEdicionLeccion(lec: Leccion) {
    this.editLeccionId = lec.id_leccion;
    this.editLeccion = { nombre: lec.nombre, codigo: lec.codigo, tipo: lec.tipo };
  }

  onDragStartLeccion(lec: Leccion) {
    this.draggingLeccionId = lec.id_leccion;
  }

  onDropLeccion(target: Leccion) {
    if (!this.moduloActual || !this.draggingLeccionId || this.draggingLeccionId === target.id_leccion) return;
    const list = this.moduloActual.lecciones;
    const fromIndex = list.findIndex((l) => l.id_leccion === this.draggingLeccionId);
    const toIndex = list.findIndex((l) => l.id_leccion === target.id_leccion);
    if (fromIndex < 0 || toIndex < 0) return;
    const [moved] = list.splice(fromIndex, 1);
    list.splice(toIndex, 0, moved);
    this.persistOrdenLecciones(list);
  }

  private persistOrdenLecciones(list: Leccion[]) {
    list.forEach((lec, index) => {
      if (!lec.item_id) return;
      this.scorm.actualizarItem(lec.item_id, {
        identificador: `LEC_ITEM_${lec.id_leccion}`,
        titulo: lec.nombre,
        tipo_item: 'leccion',
        orden: index + 1,
        es_lanzable: 0,
        id_leccion: lec.id_leccion,
        id_padre: this.moduloActual?.item_id || null,
      }).subscribe();
    });
  }

  cancelarEdicionLeccion() {
    this.editLeccionId = null;
    this.editLeccion = { nombre: '', codigo: '', tipo: '' };
  }

  guardarEdicionLeccion(lec: Leccion) {
    if (!this.editLeccion.nombre || !this.editLeccion.tipo) {
      this.toast.warn('Rellena nombre y tipo de la leccion.');
      return;
    }
    this.validarCodigoLeccionEdit(lec);
    if (this.codigoLeccionEditError) {
      this.toast.warn(this.codigoLeccionEditError);
      return;
    }
    const codigo = this.editLeccion.codigo || this.buildCodigo('LEC', this.editLeccion.nombre);
    this.scorm
      .actualizarLeccion(lec.id_leccion, {
        nombre_leccion: this.editLeccion.nombre,
        tipo_leccion: this.editLeccion.tipo,
        codigo_leccion: codigo,
      })
      .subscribe({
        next: () => {
          lec.nombre = this.editLeccion.nombre;
          lec.codigo = codigo;
          lec.tipo = this.editLeccion.tipo;
          this.actualizarItemLeccion(lec.id_leccion, lec.nombre);
          this.cancelarEdicionLeccion();
          this.toast.success('Leccion actualizada.');
        },
        error: () => this.toast.error('Error al actualizar leccion.'),
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
      error: () => this.toast.error('Error al eliminar leccion.'),
    });
  }

  private actualizarItemModulo(id_modulo: number, titulo: string) {
    const orgId = this.state.getOrganizationId();
    if (!orgId) return;
    this.scorm.listarItems(orgId).subscribe({
      next: (items: any[]) => {
        const item = items.find((i) => i.tipo_item === 'modulo' && i.id_modulo === id_modulo);
        if (item) {
          this.scorm.actualizarItem(item.id_item, {
            identificador: item.identificador,
            titulo,
            tipo_item: item.tipo_item,
            orden: item.orden,
            es_lanzable: item.es_lanzable,
            id_modulo: item.id_modulo,
          }).subscribe();
        }
      },
    });
  }

  private actualizarItemLeccion(id_leccion: number, titulo: string) {
    const orgId = this.state.getOrganizationId();
    if (!orgId) return;
    this.scorm.listarItems(orgId).subscribe({
      next: (items: any[]) => {
        const item = items.find((i) => i.tipo_item === 'leccion' && i.id_leccion === id_leccion);
        if (item) {
          this.scorm.actualizarItem(item.id_item, {
            identificador: item.identificador,
            titulo,
            tipo_item: item.tipo_item,
            orden: item.orden,
            es_lanzable: item.es_lanzable,
            id_leccion: item.id_leccion,
            id_padre: item.id_padre,
          }).subscribe();
        }
      },
    });
  }

  irARecursos() {
    this.router.navigate(['/resources']);
  }
}
