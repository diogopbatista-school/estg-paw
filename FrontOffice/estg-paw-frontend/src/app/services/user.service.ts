import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User } from '../models/user.module';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private apiUrl = 'http://localhost:3000/api/user';

  constructor(private http: HttpClient) {}

  /**
   * Atualiza o perfil do usuário autenticado
   * @param formData FormData com os dados do usuário e imagem
   */
  updateProfile(formData: FormData): Observable<any> {
    const token = localStorage.getItem('token'); // ou de onde você armazena o JWT
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
    return this.http.put(`${this.apiUrl}/edit`, formData, { headers, withCredentials: true });
  }
  /**
   * Pesquisa usuário por email (para validação de destinatário de voucher)
   */
  findUserByEmail(email: string): Observable<User | null> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
    return this.http.get<User | null>(`${this.apiUrl}/findByEmail/${encodeURIComponent(email)}`, { headers });
  }
}
