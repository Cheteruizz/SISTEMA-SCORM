import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
@Component({
  selector: 'app-scorm-home',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent {
 // Estado inicial: mostramos el menú principal
  vistaActual: string = 'menu';

  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authService = inject(AuthService);
  loginForm: FormGroup;
  registroForm: FormGroup;

  constructor() {
    // Inicializar formulario de Login
    this.loginForm = this.fb.group({
      usuario: ['', Validators.required],
      password: ['', Validators.required],
      recordarme: [false]
    });
    this.registroForm = this.fb.group({
      nombre: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      repetirPassword: ['', Validators.required]
    });
  }
  // Función para navegar
  // Recibe el nombre de la vista a la que queremos ir ('menu', 'login', 'registro')
  cambiarVista(vista: string) {
    this.vistaActual = vista;
  }
  // 3. Funciones para enviar datos al backend
  onSubmitLogin() {
    if (this.loginForm.valid) {
      // Llamamos al servicio (backend)
      this.authService.login(this.loginForm.value).subscribe({
        next: (respuesta) => {
          // El backend respondió con éxito (código 200)
          console.log('Login correcto', respuesta);
          
          // AQUÍ guardas el token si te mandan uno
          // localStorage.setItem('token', respuesta.token);

          // Y AQUÍ rediriges
          this.router.navigate(['/layout']);
        },
        error: (error) => {
          // El backend dijo que la contraseña está mal
          alert('Usuario o contraseña incorrectos');
          console.error(error);
        }
      });
    }
  }
  onSubmitRegistro() {
    if (this.registroForm.valid) {
      // 1. Validación extra: comprobar que las contraseñas coinciden
      const datos = this.registroForm.value;
      if (datos.password !== datos.repetirPassword) {
        alert('Las contraseñas no coinciden');
        return;
      }

      // 2. Llamada al servicio (igual que en el login)
      this.authService.registro(datos).subscribe({
        next: (respuesta: any) => {
          console.log('Registro correcto', respuesta);
          // Redirigir al layout
          this.router.navigate(['/layout']);
        },
        error: (error: any) => {
          alert('Error al registrar usuario');
          console.error(error);
        }
      });
    } else {
        alert('Por favor, rellena todos los campos correctamente');
    }
  }

}
