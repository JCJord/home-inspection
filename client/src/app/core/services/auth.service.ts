import { inject, Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RegisterRequestDto } from '../dtos/register-request.dto';
import { LoginRequestDto } from '../dtos/login-request.dto';
import { AuthResponse } from '../models/auth-response.interface';
import { Inspector } from '../models/inspector.interface';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/auth`;

  // --- State ---
  token = signal<string | null>(localStorage.getItem('access_token'));
  currentUser = signal<Pick<Inspector, 'id' | 'email' | 'name'> | null>(
    JSON.parse(localStorage.getItem('current_user') || 'null')
  );

  // --- Computed ---
  isAuthenticated = computed(() => !!this.token());

  /**
   * Registers a new inspector.
   * @param dto Registration data
   * @returns Observable with user info and access token
   */
  register(dto: RegisterRequestDto): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, dto).pipe(
      tap((response) => this.setSession(response))
    );
  }

  /**
   * Logs in an existing inspector.
   * @param dto Login credentials
   * @returns Observable with user info and access token
   */
  login(dto: LoginRequestDto): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, dto).pipe(
      tap((response) => this.setSession(response))
    );
  }

  /**
   * Saves the token and user data in local storage and updates signals.
   */
  setSession(response: AuthResponse) {
    localStorage.setItem('access_token', response.access_token);
    localStorage.setItem('current_user', JSON.stringify(response.user));
    this.token.set(response.access_token);
    this.currentUser.set(response.user);
  }

  /**
   * Clears the session from local storage and signals.
   */
  logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('current_user');
    this.token.set(null);
    this.currentUser.set(null);
  }
}
