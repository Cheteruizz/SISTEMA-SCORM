import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  
  // URL PROVISIONAL 
  private apiUrl = 'http://localhost:3000/api'; 

  login(credenciales: any): Observable<any> {
    // Esto enviará un JSON { usuario: '...', password: '...' }
    return this.http.post(`${this.apiUrl}/login`, credenciales);
  }

  registro(datosUsuario: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, datosUsuario);
  }
}