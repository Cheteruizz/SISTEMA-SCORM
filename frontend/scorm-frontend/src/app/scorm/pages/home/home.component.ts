import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-scorm-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent {
 // Estado inicial: mostramos el menú principal
  vistaActual: string = 'menu';

  // Función para navegar
  // Recibe el nombre de la vista a la que queremos ir ('menu', 'login', 'registro')
  cambiarVista(vista: string) {
    this.vistaActual = vista;
  }
}
