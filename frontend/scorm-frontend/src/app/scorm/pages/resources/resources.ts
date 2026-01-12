import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-resources',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './resources.html',
  styleUrls: ['./resources.scss']
})
export class ResourcesComponent {
  
  private fb = inject(FormBuilder);
  private router = inject(Router);

  recursosForm: FormGroup;

  // Variables para manejar el archivo
  archivoSeleccionado: File | null = null;
  nombreArchivoSeleccionado: string = '';

  // 1. LISTA BLANCA (Tu configuración)
  private extensionesPermitidas = [
    'pdf', 
    'jpg', 'jpeg', 'png', 'gif', 
    'mp4', 'avi', 'mov', 
    'doc', 'docx', 'txt',
    'zip', 'rar', 
    'scorm'
  ];

  // 2. DICCIONARIO DE MENSAJES (Ingeniería inversa de iLovePDF)
  private iloveLang = {
    InvalidExtension: 'Lo sentimos, este formato no está soportado',
    EmptyFile: 'Tu archivo está vacío o dañado',
    DamagedFile: 'Archivo dañado/corrupto', // Usado para bloquear accesos directos
    FileSizeExceeded: 'El tamaño de tu documento supera el límite',
    UploadError: 'Error de subida',
    Success: '¡Subida completada!'
  };

  constructor() {
    this.recursosForm = this.fb.group({
      nombreArchivo: ['', Validators.required],
      idArchivo: ['', Validators.required], // Mantenemos tu campo ID
      tipoArchivo: ['', Validators.required]
    });
  }

  // --- LÓGICA DE VALIDACIÓN PROFESIONAL ---

  /**
   * Se ejecuta cuando el usuario selecciona un archivo
   */
  onFileSelected(event: any) {
    const file: File = event.target.files[0];

    // Si el usuario cancela la selección, no hacemos nada
    if (!file) return;

    // --- ZONA DE DIAGNÓSTICO (MIRA LA CONSOLA F12) ---
    // Esto te ayudará a ver si Windows te está pasando un acceso directo o el archivo real
    const limiteMB = 50; 
    const limiteBytes = limiteMB * 1024 * 1024;

    console.log('--- DIAGNÓSTICO DE ARCHIVO ---');
    console.log('Nombre:', file.name);
    console.log('Tipo:', file.type);
    console.log('Tamaño:', file.size, 'bytes');

    // =========================================================
    // 🛡️ BARRERAS DE SEGURIDAD (Lógica iLovePDF)
    // =========================================================

    // REGLA 1: ARCHIVOS VACÍOS (EmptyFile)
    // Bloqueamos archivos de 0 bytes o casi vacíos (metadata residual)
    if (file.size <= 10) {
      this.mostrarError('🚫 ' + this.iloveLang.EmptyFile);
      this.limpiarInput(event);
      return;
    }

    // REGLA 2: DETECTOR DE ACCESOS DIRECTOS (DamagedFile)
    // Si pesa menos de 2KB (2048 bytes) y NO es un archivo de texto (.txt)
    // es casi seguro un acceso directo corrupto (.lnk) que el navegador leyó mal.
    const esTexto = file.name.toLowerCase().endsWith('.txt') || file.type === 'text/plain';
    
    if (file.size < 2048 && !esTexto) {
      // Usamos su mensaje de "DamagedFile" para dar feedback profesional
      this.mostrarError('🚫 ' + this.iloveLang.DamagedFile + '\n\nParece un acceso directo (.lnk). Por favor, selecciona el archivo original.');
      this.limpiarInput(event);
      return;
    }

    // REGLA 3: EXTENSIONES DE SISTEMA PROHIBIDAS
    if (file.name.toLowerCase().endsWith('.lnk') || file.name.toLowerCase().endsWith('.url')) {
      this.mostrarError('🚫 No se permiten accesos directos.');
      this.limpiarInput(event);
      return;
    }

    // REGLA 4: LISTA BLANCA DE EXTENSIONES (InvalidExtension)
    if (!this.validarExtension(file.name)) {
      this.mostrarError('❌ ' + this.iloveLang.InvalidExtension + '\nSolo aceptamos: ' + this.extensionesPermitidas.join(', '));
      this.limpiarInput(event);
      return;
    }

    // REGLA 5: LÍMITE DE TAMAÑO (FileSizeExceeded)
    if (file.size > limiteBytes) {
      this.mostrarError('⚠️ ' + this.iloveLang.FileSizeExceeded + ` (Máx ${limiteMB}MB)`);
      this.limpiarInput(event);
      return;
    }

    // =========================================================
    // ✅ ÉXITO: EL ARCHIVO ES SEGURO
    // =========================================================
    
    this.archivoSeleccionado = file;
    this.nombreArchivoSeleccionado = file.name;

    // Rellenamos el formulario automáticamente
    this.recursosForm.patchValue({
      nombreArchivo: file.name,
      // Como no sé de dónde sacas el ID, dejo esto vacío o genérico, o mantenlo como estaba si lo generas tú
      idArchivo: 'ID-' + new Date().getTime(), 
      tipoArchivo: this.obtenerEtiquetaTipo(file.name, file.type)
    });
  }

  // --- FUNCIONES AUXILIARES ---

  mostrarError(mensaje: string) {
    alert(mensaje);
  }

  limpiarInput(event: any) {
    event.target.value = ''; // Resetea el input HTML
    this.archivoSeleccionado = null;
    this.nombreArchivoSeleccionado = '';
    this.recursosForm.reset();
  }

  validarExtension(nombreArchivo: string): boolean {
    const extension = nombreArchivo.split('.').pop()?.toLowerCase() || '';
    return this.extensionesPermitidas.includes(extension);
  }

  obtenerEtiquetaTipo(nombre: string, mimeType: string): string {
    const ext = nombre.split('.').pop()?.toLowerCase();
    
    if (ext === 'pdf') return 'Documento PDF';
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext!)) return 'Imagen';
    if (['mp4', 'avi', 'mov'].includes(ext!)) return 'Vídeo';
    if (['zip', 'rar'].includes(ext!)) return 'Archivo Comprimido (ZIP)';
    if (ext === 'scorm') return 'Paquete SCORM';
    if (['doc', 'docx'].includes(ext!)) return 'Documento Word';
    if (ext === 'txt') return 'Documento de Texto';
    
    return mimeType || 'Archivo General';
  }

  // --- NAVEGACIÓN (Tus funciones originales) ---

  volver() {
    this.router.navigate(['/organizations']);
  }

  irAVistaPrevia() {
    this.router.navigate(['/preview']);
  }

  // --- ACCIONES DE BOTONES ---

  subirArchivo() {
    if (this.recursosForm.valid && this.archivoSeleccionado) {
      
      console.log('--- SUBIENDO ---');
      console.log('Archivo:', this.archivoSeleccionado.name);
      
      // Simulación de éxito usando el mensaje oficial
      alert('✅ ' + this.iloveLang.Success + '\nArchivo: ' + this.nombreArchivoSeleccionado);
      
    } else {
      this.recursosForm.markAllAsTouched();
      
      if (!this.archivoSeleccionado) {
        alert('Por favor, selecciona un archivo primero.');
      } else {
        alert('Por favor, rellena todos los campos obligatorios.');
      }
    }
  }

  eliminarArchivo() {
    // Limpieza total
    this.recursosForm.reset();
    this.archivoSeleccionado = null;
    this.nombreArchivoSeleccionado = '';
    console.log('Formulario y archivo limpiados');
  }
}