import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ScormService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/api';

  crearProyecto(data: {
    id_usuario: number;
    titulo: string;
    descripcion?: string;
    version_scorm: string;
    estado: string;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/proyectos`, data);
  }

  actualizarProyecto(id_proyecto: number, data: {
    titulo: string;
    descripcion?: string;
    version_scorm: string;
    estado: string;
  }): Observable<any> {
    return this.http.put(`${this.apiUrl}/proyectos/${id_proyecto}`, data);
  }

  obtenerProyecto(id_proyecto: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/proyectos/${id_proyecto}`);
  }

  crearMetadata(data: {
    id_proyecto: number;
    idioma: string;
    autor_principal?: string;
    organizacion?: string;
    entidad_publicadora?: string;
    palabras_clave?: string;
    objetivo?: string;
    descripcion_detallada?: string;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/metadata`, data);
  }

  listarMetadata(id_proyecto: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/metadata`, { params: { id_proyecto } });
  }

  crearManifest(data: { id_proyecto: number; identificador: string; version?: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/manifests`, data);
  }

  crearOrganizacion(data: {
    id_manifest: number;
    identificador: string;
    titulo: string;
    es_principal: number;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/organizaciones`, data);
  }

  listarModulos(id_proyecto: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/modulos`, { params: { id_proyecto } });
  }

  crearModulo(data: {
    id_proyecto: number;
    nombre_modulo: string;
    descripcion?: string;
    duracion_minutos?: number | null;
    codigo_modulo?: string | null;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/modulos`, data);
  }

  listarLecciones(id_modulo: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/lecciones`, { params: { id_modulo } });
  }

  crearLeccion(data: {
    id_modulo: number;
    nombre_leccion: string;
    tipo_leccion: string;
    descripcion?: string;
    duracion_minutos?: number | null;
    codigo_leccion?: string | null;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/lecciones`, data);
  }

  eliminarLeccion(id_leccion: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/lecciones/${id_leccion}`);
  }

  subirArchivo(id_proyecto: number, id_leccion: number | null, file: File): Observable<any> {
    const form = new FormData();
    form.append('id_proyecto', String(id_proyecto));
    if (id_leccion) {
      form.append('id_leccion', String(id_leccion));
    }
    form.append('file', file);
    return this.http.post(`${this.apiUrl}/archivos/upload`, form);
  }

  crearRecurso(data: {
    id_manifest: number;
    id_archivo: number;
    identificador: string;
    href: string;
    tipo_recurso: string;
    scorm_type: string;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/recursos`, data);
  }

  listarRecursos(id_manifest: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/recursos`, { params: { id_manifest } });
  }

  crearItem(data: {
    id_organizacion: number;
    id_padre?: number | null;
    identificador: string;
    titulo: string;
    tipo_item: string;
    orden: number;
    es_lanzable: number;
    id_modulo?: number | null;
    id_leccion?: number | null;
    id_recurso?: number | null;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/items`, data);
  }

  listarItems(id_organizacion: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/items`, { params: { id_organizacion } });
  }

  generarScorm(id_proyecto: number): Observable<Blob> {
    return this.http.post(`${this.apiUrl}/scorm/${id_proyecto}/generar-1-2`, {}, { responseType: 'blob' });
  }

  generarScorm2004(id_proyecto: number): Observable<Blob> {
    return this.http.post(`${this.apiUrl}/scorm/${id_proyecto}/generar-2004`, {}, { responseType: 'blob' });
  }
}
