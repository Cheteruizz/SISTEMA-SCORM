import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Definimos la interfaz aquí mismo o impórtala si la tienes en otro lado
interface CourseResource {
  fileName: string;
  fileId: string;
  fileType: string;
}

@Component({
  selector: 'app-resources',
  standalone: true,
  imports: [CommonModule, FormsModule], // Importaciones necesarias para standalone
  templateUrl: './resources.html',
  styleUrls: ['./resources.scss']
})
export class ResourcesComponent {

  // Estado del formulario
  resource: CourseResource = {
    fileName: '',
    fileId: '',
    fileType: ''
  };

  constructor() {}

  // Lógica del botón "Eliminar Archivo"
  onDelete(): void {
    this.resource = {
      fileName: '',
      fileId: '',
      fileType: ''
    };
    console.log('Formulario limpiado');
  }

  // Lógica del botón "SUBIR ARCHIVO"
  onUpload(): void {
    if (!this.resource.fileName || !this.resource.fileId) {
      alert('Por favor, completa el nombre y el ID del archivo.');
      return;
    }
    
    console.log('Datos a subir:', this.resource);
    alert(`Archivo "${this.resource.fileName}" subido correctamente.`);
    // Aquí iría la llamada a tu servicio backend
  }

  // Lógica del botón "Vista previa"
  onPreview(): void {
    if (this.resource.fileName) {
      alert(`Generando vista previa para: ${this.resource.fileName}`);
    } else {
      alert('Escribe un nombre de archivo para ver la vista previa.');
    }
  }
}