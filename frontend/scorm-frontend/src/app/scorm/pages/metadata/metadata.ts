import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';

// Definimos los nombres de los pasos del formulario
type Paso = 'explicacion' | 'infoBasica' | 'autoria';

@Component({
  selector: 'app-metadata',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './metadata.html',     
  styleUrls: ['./metadata.scss']      
})
export class MetadataComponent {
  
  private fb = inject(FormBuilder);
  private router = inject(Router);
  
  // Estado para controlar el paso actual del formulario
  pasoActual: Paso = 'explicacion';

  // Formulario principal
  metadataForm: FormGroup;

  constructor() {
    this.metadataForm = this.fb.group({
      // Paso 2: Información básica
      titulo: ['', Validators.required],
      descripcion: [''],
      idioma: ['es', Validators.required],
      
      // Paso 3: Información de autoría
      autor: [''],
      organizacion: [''],
      entidadPublicadora: ['']
    });
  }

  // Función para cambiar el paso actual (dentro de la misma pantalla)
  cambiarPaso(nuevoPaso: Paso) {
    this.pasoActual = nuevoPaso;
  }

  // ✅ ACTUALIZADO: Función para el botón "Volver" (Sale de la pantalla)
  volver() {
    this.router.navigate(['/layout']); 
  }

  // Función para "Continuar configurando"
  onSubmitMetadata() {
    if (this.metadataForm.valid) {
      // 1. Aquí iría la lógica de guardado real (servicio/localStorage)
      console.log('Datos guardados en Metadata:', this.metadataForm.value);
      
      // 2. Navegamos a la siguiente pantalla: Organizations
      this.router.navigate(['/organizations']); 

    } else {
      this.metadataForm.markAllAsTouched();
      alert('Por favor, completa los campos obligatorios antes de continuar.');
    }
  }
}
