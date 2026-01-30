import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ScormStateService } from '../../../services/scorm-state.service';
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
  private state = inject(ScormStateService);



  crearPaquete(){
    //Va a la pantalla de crear paquetes
    this.router.navigate(['/metadata']);
  }

  historial(){
    //Va al historial de paquetes creados
    this.router.navigate(['/history']);
  }

  importarProyecto(){
    this.state.setImportReturn('/layout');
    this.router.navigate(['/importar']);
  }

  volver(){
    this.router.navigate(['/home']);
  }
}
