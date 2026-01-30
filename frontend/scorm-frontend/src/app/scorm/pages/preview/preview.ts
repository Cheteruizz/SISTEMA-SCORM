import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ScormService } from '../../../services/scorm.service';
import { ScormStateService } from '../../../services/scorm-state.service';
import { ScormNavComponent } from '../../components/scorm-nav/scorm-nav';

interface LeccionResumen {
  id: number;
  codigo: string;
  nombre: string;
  tipo: string;
  recursos: string[];
}

interface ModuloResumen {
  id: number;
  nombre: string;
  codigo: string;
  lecciones: LeccionResumen[];
}

@Component({
  standalone: true,
  imports: [CommonModule, ScormNavComponent],
  templateUrl: './preview.html',
  styleUrls: ['./preview.scss'],
})
export class PreviewComponent implements OnInit {
  private scorm = inject(ScormService);
  private state = inject(ScormStateService);
  private router = inject(Router);

  proyecto: any = null;
  metadata: any = null;
  modulos: ModuloResumen[] = [];
  recursos: any[] = [];
  versionLabel = '1.2';
  scormGenerado = false;
  validacion: { valido: boolean; errores: string[]; warnings: string[] } | null = null;
  validando = false;
  runtimeTesting = false;
  runtimeTested = false;
  runtimeResults: Array<{ recurso: string; estado: 'ok' | 'warn' | 'fail'; detalles: string[] }> = [];

  ngOnInit() {
    const projectId = this.state.getProjectId();
    const manifestId = this.state.getManifestId();
    const orgId = this.state.getOrganizationId();
    const version = this.state.getVersion();
    this.versionLabel = version === '2004_4th' ? '2004' : '1.2';
    if (!projectId || !manifestId || !orgId) {
      alert('No hay proyecto activo.');
      this.router.navigate(['/metadata']);
      return;
    }

    this.scorm.obtenerProyecto(projectId).subscribe({
      next: (proyecto) => (this.proyecto = proyecto),
    });

    this.scorm.listarMetadata(projectId).subscribe({
      next: (metadataList) => {
        this.metadata = metadataList && metadataList.length ? metadataList[0] : null;
      },
    });

    this.scorm.listarModulos(projectId).subscribe({
      next: (modulos) => {
        const resumen: ModuloResumen[] = modulos.map((mod: any) => ({
          id: mod.id_modulo,
          nombre: mod.nombre_modulo,
          codigo: mod.codigo_modulo || `MOD-${mod.id_modulo}`,
          lecciones: [],
        }));

        this.scorm.listarRecursos(manifestId).subscribe({
          next: (recursos: any[]) => {
            this.recursos = recursos || [];
            const recursosMap: Record<number, string> = {};
            recursos.forEach((recurso) => {
              recursosMap[recurso.id_recurso] = recurso.href || recurso.identificador;
            });

            this.scorm.listarItems(orgId).subscribe({
              next: (items: any[]) => {
                const recursosPorLeccion: Record<number, string[]> = {};
                items.forEach((item) => {
                  if (!item.id_leccion || !item.id_recurso) return;
                  if (!recursosPorLeccion[item.id_leccion]) {
                    recursosPorLeccion[item.id_leccion] = [];
                  }
                  const nombreRecurso = recursosMap[item.id_recurso] || `RES-${item.id_recurso}`;
                  recursosPorLeccion[item.id_leccion].push(nombreRecurso);
                });

                resumen.forEach((mod) => {
                  this.scorm.listarLecciones(mod.id).subscribe({
                    next: (lecciones) => {
                      mod.lecciones = lecciones.map((lec: any) => ({
                        id: lec.id_leccion,
                        codigo: lec.codigo_leccion || `LEC-${lec.id_leccion}`,
                        nombre: lec.nombre_leccion,
                        tipo: lec.tipo_leccion,
                        recursos: recursosPorLeccion[lec.id_leccion] || [],
                      }));
                    },
                  });
                });

                this.modulos = resumen;
              },
            });
          },
        });
      },
    });
  }

  volver() {
    this.router.navigate(['/resources']);
  }

  generarScorm() {
    const projectId = this.state.getProjectId();
    if (!projectId) {
      alert('No hay proyecto activo.');
      return;
    }

    this.validando = true;
    this.scorm.validarScorm(projectId).subscribe({
      next: (resultado) => {
        this.validacion = resultado;
        this.validando = false;
        if (!resultado.valido) {
          alert('Hay errores de validacion. Revisa la lista antes de generar.');
          return;
        }
        this.generarScormZip(projectId);
      },
      error: () => {
        this.validando = false;
        alert('No se pudo validar el proyecto.');
      },
    });
  }

  private generarScormZip(projectId: number) {
    const version = this.state.getVersion();
    const generar$ =
      version === '2004_4th' ? this.scorm.generarScorm2004(projectId) : this.scorm.generarScorm(projectId);

    generar$.subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = version === '2004_4th' ? `scorm2004_${projectId}.zip` : `scorm_${projectId}.zip`;
        link.click();
        window.URL.revokeObjectURL(url);
        this.scormGenerado = true;
      },
      error: () => alert('Error al generar SCORM.'),
    });
  }

  finalizar() {
    this.state.clearProjectData();
    this.router.navigate(['/layout']);
  }

  async ejecutarSmokeTest() {
    if (!this.recursos.length) {
      alert('No hay recursos disponibles para probar.');
      return;
    }
    const version = this.state.getVersion() || '1.2';
    const recursosSco = this.recursos.filter((recurso) => (recurso.scorm_type || 'sco') === 'sco');
    if (!recursosSco.length) {
      alert('No hay SCOs para probar.');
      return;
    }

    this.runtimeTesting = true;
    this.runtimeTested = false;
    this.runtimeResults = [];

    for (const recurso of recursosSco) {
      const result = await this.probarRecursoRuntime(recurso, version);
      this.runtimeResults.push(result);
    }

    this.runtimeTesting = false;
    this.runtimeTested = true;
  }

  private probarRecursoRuntime(recurso: any, version: string) {
    return new Promise<{ recurso: string; estado: 'ok' | 'warn' | 'fail'; detalles: string[] }>((resolve) => {
      const detalles: string[] = [];
      const href = recurso.href || recurso.nombre_fisico;
      if (!href) {
        resolve({ recurso: recurso.identificador || 'SCO', estado: 'fail', detalles: ['Sin href de entrada'] });
        return;
      }

      const calls: Record<string, number> = {};
      const register = (name: string) => {
        calls[name] = (calls[name] || 0) + 1;
        return 'true';
      };

      const api12 = {
        LMSInitialize: () => register('LMSInitialize'),
        LMSSetValue: () => register('LMSSetValue'),
        LMSGetValue: () => register('LMSGetValue'),
        LMSCommit: () => register('LMSCommit'),
        LMSFinish: () => register('LMSFinish'),
        LMSGetLastError: () => '0',
        LMSGetErrorString: () => '',
        LMSGetDiagnostic: () => '',
      };

      const api2004 = {
        Initialize: () => register('Initialize'),
        SetValue: () => register('SetValue'),
        GetValue: () => register('GetValue'),
        Commit: () => register('Commit'),
        Terminate: () => register('Terminate'),
        GetLastError: () => '0',
        GetErrorString: () => '',
        GetDiagnostic: () => '',
      };

      (window as any).API = api12;
      (window as any).API_1484_11 = api2004;

      const iframe = document.createElement('iframe');
      iframe.style.width = '1px';
      iframe.style.height = '1px';
      iframe.style.opacity = '0';
      iframe.style.position = 'fixed';
      iframe.style.pointerEvents = 'none';
      iframe.style.border = '0';
      iframe.src = `http://localhost:3000/uploads/${encodeURI(href)}`;
      document.body.appendChild(iframe);

      const timeout = setTimeout(() => {
        if (iframe.parentElement) {
          iframe.parentElement.removeChild(iframe);
        }
        (window as any).API = null;
        (window as any).API_1484_11 = null;

        const initCalled = version === '2004_4th' ? calls['Initialize'] : calls['LMSInitialize'];
        const commitCalled = version === '2004_4th' ? calls['Commit'] : calls['LMSCommit'];
        const termCalled = version === '2004_4th' ? calls['Terminate'] : calls['LMSFinish'];
        const setCalled = version === '2004_4th' ? calls['SetValue'] : calls['LMSSetValue'];

        if (!initCalled) {
          detalles.push('No se detecto Initialize/LMSInitialize.');
        }
        if (!setCalled) {
          detalles.push('No se detecto SetValue/LMSSetValue.');
        }
        if (!commitCalled) {
          detalles.push('No se detecto Commit/LMSCommit.');
        }
        if (!termCalled) {
          detalles.push('No se detecto Terminate/LMSFinish.');
        }

        const estado = detalles.length === 0 ? 'ok' : 'warn';
        resolve({
          recurso: recurso.identificador || recurso.href || 'SCO',
          estado,
          detalles: detalles.length ? detalles : ['Runtime SCORM detectado correctamente.'],
        });
      }, 6000);

      iframe.onerror = () => {
        clearTimeout(timeout);
        if (iframe.parentElement) {
          iframe.parentElement.removeChild(iframe);
        }
        (window as any).API = null;
        (window as any).API_1484_11 = null;
        resolve({
          recurso: recurso.identificador || 'SCO',
          estado: 'fail',
          detalles: ['No se pudo cargar el SCO para la prueba.'],
        });
      };
    });
  }
}
