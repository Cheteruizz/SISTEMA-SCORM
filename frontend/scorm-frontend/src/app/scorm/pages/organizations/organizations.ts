import { Component } from '@angular/core';
import { CommonModule } from '@angular/common'; 
import { FormsModule } from '@angular/forms'; 

// 1. Actualizamos la interfaz para incluir lecciones
interface Leccion {
  id: string;
  nombre: string;
}

interface Modulo {
  nombre: string;
  id: string;
  descripcion?: string;
  duracion?: string;
  lecciones: Leccion[]; // <--- NUEVO: Array de lecciones dentro del módulo
}

@Component({
  selector: 'app-modulos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  // Asegúrate que estos nombres coincidan con tus archivos reales
  templateUrl: './organizations.html', 
  styleUrls: ['./organizations.scss']
})
export class OrganizationsComponent {

  modulos: Modulo[] = [];
  vistaActual: 'creacion' | 'lista' | 'lecciones' = 'creacion';
  
  // Módulo seleccionado actualmente para añadirle lecciones
  moduloSeleccionadoIndex: number = -1; 

  nuevoModulo: Modulo = { nombre: '', id: '', descripcion: '', duracion: '', lecciones: [] };
  
  // Modelo temporal para la nueva lección
  nuevaLeccion: Leccion = { id: '', nombre: '' };

  cambiarVista(destino: 'creacion' | 'lista' | 'lecciones') {
    this.vistaActual = destino;
  }

  // Función para ir a la vista de lecciones de un módulo específico
  gestionarLecciones(index: number) {
    this.moduloSeleccionadoIndex = index;
    this.cambiarVista('lecciones');
  }

  irAtras() {
    if (this.vistaActual === 'lecciones') {
      this.moduloSeleccionadoIndex = -1; // Resetear selección
      this.cambiarVista('lista'); // Volver a la lista, tiene más sentido
    } else if (this.vistaActual === 'lista') {
      this.cambiarVista('creacion');
    }
  }

  crearModulo() {
    if (!this.nuevoModulo.nombre || !this.nuevoModulo.id) {
      alert("Rellena nombre e ID.");
      return;
    }
    // Inicializamos el array de lecciones vacío
    this.nuevoModulo.lecciones = []; 
    this.modulos.push({ ...this.nuevoModulo });

    // Limpiar form
    this.nuevoModulo = { nombre: '', id: '', descripcion: '', duracion: '', lecciones: [] };
    alert("Módulo creado.");
  }

  // --- LÓGICA QUE FALTABA: LECCIONES ---
  crearLeccion() {
    if (this.moduloSeleccionadoIndex === -1) return;

    if (!this.nuevaLeccion.id || !this.nuevaLeccion.nombre) {
      alert("Rellena ID y Nombre de la lección");
      return;
    }

    // Agregamos la lección al módulo seleccionado
    this.modulos[this.moduloSeleccionadoIndex].lecciones.push({ ...this.nuevaLeccion });
    
    // Limpiar inputs de lección
    this.nuevaLeccion = { id: '', nombre: '' };
  }

  borrarLeccion(indexLeccion: number) {
    if (this.moduloSeleccionadoIndex === -1) return;
    
    if(confirm("¿Borrar lección?")) {
       this.modulos[this.moduloSeleccionadoIndex].lecciones.splice(indexLeccion, 1);
    }
  }

  get moduloActual() {
    return this.modulos[this.moduloSeleccionadoIndex];
  }
}