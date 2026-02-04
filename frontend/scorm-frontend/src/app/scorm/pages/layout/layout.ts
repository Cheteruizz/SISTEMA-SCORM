import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ScormNavComponent } from '../../components/scorm-nav/scorm-nav';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [ScormNavComponent],
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

  volver(){
    this.router.navigate(['/home']);
  }
}
