import { inject, Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { decodeJwt } from '../helpers/jwt.helper';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RegisterRequestDto } from '../dtos/register-request.dto';
import { LoginRequestDto } from '../dtos/login-request.dto';
import { AuthResponse } from '../models/auth-response.interface';
import { Inspector } from '../models/inspector.interface';
import { SubscriptionStatus } from '../enums/subscription-status.enum';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/auth`;

  // --- State ---
  token = signal<string | null>(localStorage.getItem('access_token'));
  refreshTokenSignal = signal<string | null>(localStorage.getItem('refresh_token'));
  currentUser = signal<Pick<Inspector, 'id' | 'email' | 'name' | 'subscription_status'> | null>(
    JSON.parse(localStorage.getItem('current_user') || 'null')
  );

  private router = inject(Router);
  private refreshTimer?: any;

  constructor() {
    this.scheduleRefresh();
  }

  // --- Computed ---
  isAuthenticated = computed(() => !!this.token());
  isPremium = computed(() => this.currentUser()?.subscription_status === SubscriptionStatus.ACTIVE);

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
    localStorage.setItem('refresh_token', response.refresh_token);
    localStorage.setItem('current_user', JSON.stringify(response.user));
    
    this.token.set(response.access_token);
    this.refreshTokenSignal.set(response.refresh_token);
    this.currentUser.set(response.user);

    this.scheduleRefresh();
  }

  /**
   * Clears the session from local storage and signals.
   */
  logout() {
    const refreshToken = this.refreshTokenSignal();
    if (refreshToken) {
      // Background logout on server
      this.http.post(`${this.apiUrl}/logout`, { refresh_token: refreshToken }).subscribe();
    }

    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('current_user');
    
    this.token.set(null);
    this.refreshTokenSignal.set(null);
    this.currentUser.set(null);

    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    this.router.navigate(['/login']);
  }

  /**
   * Attempts to refresh the access token using the refresh token.
   */
  refreshToken(): Observable<AuthResponse> {
    const refreshToken = this.refreshTokenSignal();
    return this.http.post<AuthResponse>(`${this.apiUrl}/refresh`, { refresh_token: refreshToken }).pipe(
      tap((response) => this.setSession(response))
    );
  }

  /**
   * Schedules a proactive token refresh before the current one expires.
   */
  private scheduleRefresh() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    const token = this.token();
    if (!token) return;

    const payload = decodeJwt(token);
    if (!payload || !payload.exp) return;

    const expirationTime = payload.exp * 1000;
    const now = Date.now();
    
    // Refresh 1 minute before expiration
    const timeout = expirationTime - now - (60 * 1000);

    if (timeout > 0) {
      this.refreshTimer = setTimeout(() => {
        this.refreshToken().subscribe({
          error: () => this.logout()
        });
      }, timeout);
    } else {
      // Already expired or very close
      this.refreshToken().subscribe({
        error: () => this.logout()
      });
    }
  }
}
