import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ScormService } from '../../../services/scorm.service';
import { ScormStateService } from '../../../services/scorm-state.service';

@Component({
  standalone: true,
  imports: [CommonModule],
  templateUrl: './history.html',
  styleUrls: ['./history.scss'],
})
export class HistoryComponent implements OnInit {
  private router = inject(Router);
  private scorm = inject(ScormService);
  private state = inject(ScormStateService);

  proyectos: any[] = [];
  paquetesPorProyecto: Record<number, any[]> = {};
  cargando = true;
  error = '';

  volver() {
    this.router.navigate(['/layout']);
  }

  ngOnInit() {
    const userId = this.state.getUserId();
    if (!userId) {
      this.error = 'Debes iniciar sesion para ver el historial.';
      this.cargando = false;
      return;
    }

    this.scorm.listarProyectos().subscribe({
      next: (proyectos: any[]) => {
        const propios = (proyectos || []).filter((p) => p.id_usuario === userId);
        this.proyectos = propios;
        if (!propios.length) {
          this.cargando = false;
          return;
        }

        let pendientes = propios.length;
        propios.forEach((proyecto) => {
          this.scorm.listarPaquetes(proyecto.id_proyecto).subscribe({
            next: (paquetes: any[]) => {
              this.paquetesPorProyecto[proyecto.id_proyecto] = paquetes || [];
            },
            error: () => {
              this.paquetesPorProyecto[proyecto.id_proyecto] = [];
            },
            complete: () => {
              pendientes -= 1;
              if (pendientes === 0) {
                this.cargando = false;
              }
            },
          });
        });
      },
      error: () => {
        this.error = 'Error al cargar historial.';
        this.cargando = false;
      },
    });
  }
}
