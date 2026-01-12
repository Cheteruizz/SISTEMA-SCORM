import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);

  // URL PROVISIONAL
  private apiUrl = 'http://localhost:3000/api/usuarios';

  login(credenciales: { email: string; password: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, credenciales);
  }

  registro(datosUsuario: { nombre: string; email: string; password: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}`, datosUsuario);
  }
}
