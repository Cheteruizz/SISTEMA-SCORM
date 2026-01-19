import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [],
  templateUrl: './layout.html',
  styleUrls: ['./layout.scss'],
})
export class LayoutComponent {
  private router = inject(Router);



  crearPaquete(){
    //Va a la pantalla de crear paquetes
    this.router.navigate(['/metadata']);
  }

  historial(){
    //Va al historial de paquetes creados
    this.router.navigate(['/history']);
  }

  importarProyecto(){
    this.router.navigate(['/importar']);
  }

  volver(){
    this.router.navigate(['/home']);
  }
}
