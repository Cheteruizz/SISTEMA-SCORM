import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config';

@Injectable({
  providedIn: 'root',
})
export class ScormService {
  private http = inject(HttpClient);
  private apiUrl = API_BASE_URL;

  crearProyecto(data: {
    id_usuario: number;
    titulo: string;
    descripcion?: string;
    version_scorm: string;
    estado: string;
    tracking_preset_default?: string;
    tracking_auto_default?: boolean;
    tracking_min_seconds_default?: number;
    tracking_media_ratio_default?: number;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/proyectos`, data);
  }

  listarProyectos(): Observable<any> {
    return this.http.get(`${this.apiUrl}/proyectos`);
  }

  actualizarProyecto(id_proyecto: number, data: {
    titulo: string;
    descripcion?: string;
    version_scorm: string;
    estado: string;
    tracking_preset_default?: string;
    tracking_auto_default?: boolean;
    tracking_min_seconds_default?: number;
    tracking_media_ratio_default?: number;
  }): Observable<any> {
    return this.http.put(`${this.apiUrl}/proyectos/${id_proyecto}`, data);
  }

  obtenerProyecto(id_proyecto: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/proyectos/${id_proyecto}`);
  }

  eliminarProyecto(id_proyecto: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/proyectos/${id_proyecto}`);
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
    portada_ruta?: string;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/metadata`, data);
  }

  listarMetadata(id_proyecto: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/metadata`, { params: { id_proyecto } });
  }

  crearManifest(data: { id_proyecto: number; identificador: string; version?: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/manifests`, data);
  }

  listarManifests(id_proyecto: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/manifests`, { params: { id_proyecto } });
  }

  crearOrganizacion(data: {
    id_manifest: number;
    identificador: string;
    titulo: string;
    es_principal: number;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/organizaciones`, data);
  }

  listarOrganizaciones(id_manifest: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/organizaciones`, { params: { id_manifest } });
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

  actualizarModulo(id_modulo: number, data: {
    nombre_modulo: string;
    descripcion?: string;
    duracion_minutos?: number | null;
    codigo_modulo?: string | null;
  }): Observable<any> {
    return this.http.put(`${this.apiUrl}/modulos/${id_modulo}`, data);
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

  actualizarLeccion(id_leccion: number, data: {
    nombre_leccion: string;
    tipo_leccion: string;
    descripcion?: string;
    duracion_minutos?: number | null;
    codigo_leccion?: string | null;
  }): Observable<any> {
    return this.http.put(`${this.apiUrl}/lecciones/${id_leccion}`, data);
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

  listarArchivos(id_proyecto: number, id_leccion?: number | null): Observable<any> {
    const params: any = { id_proyecto };
    if (id_leccion) {
      params.id_leccion = id_leccion;
    }
    return this.http.get(`${this.apiUrl}/archivos`, { params });
  }

  crearRecurso(data: {
    id_manifest: number;
    id_archivo: number;
    identificador: string;
    href: string;
    tipo_recurso: string;
    scorm_type: string;
    parametros?: string;
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

  actualizarItem(id_item: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/items/${id_item}`, data);
  }

  generarScorm(id_proyecto: number): Observable<Blob> {
    return this.http.post(`${this.apiUrl}/scorm/${id_proyecto}/generar-1-2`, {}, { responseType: 'blob' });
  }

  generarScorm2004(id_proyecto: number): Observable<Blob> {
    return this.http.post(`${this.apiUrl}/scorm/${id_proyecto}/generar-2004`, {}, { responseType: 'blob' });
  }

  validarScorm(id_proyecto: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/scorm/${id_proyecto}/validar`);
  }

  auditarScorm(id_proyecto: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/scorm/${id_proyecto}/auditar`);
  }

  listarPaquetes(id_proyecto: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/paquetes`, { params: { id_proyecto } });
  }

  crearRuntimeSesion(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/scorm/runtime/sesion`, data);
  }

  actualizarRuntimeSesion(id_sesion: number, data: any): Observable<any> {
    return this.http.patch(`${this.apiUrl}/scorm/runtime/sesion/${id_sesion}`, data);
  }

  obtenerCmi(id_sesion: number, prefix?: string): Observable<any> {
    let params: { [key: string]: string } | undefined;
    if (prefix) {
      params = { prefix };
    }
    return this.http.get(`${this.apiUrl}/scorm/runtime/cmi/${id_sesion}`, { params });
  }

  guardarCmi(id_sesion: number, data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/scorm/runtime/cmi/${id_sesion}`, data);
  }

  commitSesion(id_sesion: number, data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/scorm/runtime/${id_sesion}/commit`, data);
  }

  finalizarSesion(id_sesion: number, data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/scorm/runtime/${id_sesion}/finish`, data);
  }

  listarScos(id_proyecto: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/scorm/sco`, { params: { id_proyecto } });
  }

  obtenerSco(id_sco: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/scorm/sco/${id_sco}`);
  }

  crearSco(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/scorm/sco`, data);
  }

  actualizarSco(id_sco: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/scorm/sco/${id_sco}`, data);
  }

  eliminarSco(id_sco: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/scorm/sco/${id_sco}`);
  }

  agregarScoArchivo(id_sco: number, data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/scorm/sco/${id_sco}/archivos`, data);
  }

  eliminarScoArchivo(id_sco_archivo: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/scorm/sco/archivos/${id_sco_archivo}`);
  }

}
