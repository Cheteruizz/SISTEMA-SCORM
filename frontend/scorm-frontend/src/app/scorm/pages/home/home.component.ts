import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { ScormStateService } from '../../../services/scorm-state.service';
import { ToastService } from '../../../shared/toast/toast.service';

@Component({
  selector: 'app-scorm-home',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent {
  // Estado inicial: mostramos el menu principal
  vistaActual: string = 'menu';

  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authService = inject(AuthService);
  private state = inject(ScormStateService);
  private toast = inject(ToastService);
  loginForm: FormGroup;
  registroForm: FormGroup;

  constructor() {
    // Inicializar formulario de Login
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      recordarme: [false],
    });
    this.registroForm = this.fb.group({
      nombre: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      repetirPassword: ['', Validators.required],
    });
  }

  // Funcion para navegar
  // Recibe el nombre de la vista a la que queremos ir ('menu', 'login', 'registro')
  cambiarVista(vista: string) {
    this.vistaActual = vista;
  }

  // Enviar datos de login al backend
  onSubmitLogin() {
    if (this.loginForm.valid) {
      this.authService.login(this.loginForm.value).subscribe({
        next: (respuesta) => {
          console.log('Login correcto', respuesta);
          if (respuesta && respuesta.usuario && respuesta.usuario.id_usuario) {
            this.state.setUserId(respuesta.usuario.id_usuario);
          }
          this.router.navigate(['/layout']);
        },
        error: (error) => {
          this.toast.error('Usuario o contrasena incorrectos.');
          console.error(error);
        },
      });
    }
  }

  onSubmitRegistro() {
    if (this.registroForm.valid) {
      // Validacion extra: comprobar que las contrasenas coinciden
      const datos = this.registroForm.value;
      if (datos.password !== datos.repetirPassword) {
        this.toast.warn('Las contrasenas no coinciden.');
        return;
      }

      this.authService.registro(datos).subscribe({
        next: (respuesta: any) => {
          console.log('Registro correcto', respuesta);
          if (respuesta && respuesta.id_usuario) {
            this.state.setUserId(respuesta.id_usuario);
          }
          this.router.navigate(['/layout']);
        },
        error: (error: any) => {
          this.toast.error('Error al registrar usuario.');
          console.error(error);
        },
      });
    } else {
      this.toast.warn('Por favor, rellena todos los campos correctamente.');
    }
  }
}
