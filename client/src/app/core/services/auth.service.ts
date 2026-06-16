import { inject, Injectable, signal, computed, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { decodeJwt } from '../helpers/jwt.helper';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, shareReplay, catchError, throwError, of, finalize } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RegisterRequestDto } from '../dtos/register-request.dto';
import { LoginRequestDto } from '../dtos/login-request.dto';
import { AuthResponse } from '../models/auth-response.interface';
import { Inspector } from '../models/inspector.interface';

import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private apiUrl = `${environment.apiUrl}/auth`;

  // --- State ---
  token = signal<string | null>(localStorage.getItem('access_token'));
  refreshTokenSignal = signal<string | null>(localStorage.getItem('refresh_token'));
  currentUser = signal<Pick<Inspector, 'id' | 'email' | 'name'> | null>(
    (() => {
      try {
        const saved = localStorage.getItem('current_user');
        if (!saved || saved === 'undefined' || saved === 'null') return null;
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    })()
  );

  private refreshTimer?: any;
  private refreshTokenInProgress$?: Observable<AuthResponse>;
  private clockSkew = 0;

  constructor() {
    // Initialize clock skew on boot if a token exists
    const token = this.token();
    if (token) {
      const payload = decodeJwt(token);
      if (payload && payload.iat) {
        this.clockSkew = Date.now() - (payload.iat * 1000);
      }
    }

    this.scheduleRefresh();
    this.listenToStorageEvents();
    
    // Proactive Recovery/Refresh: Always try to refresh user data if we have a token
    // to ensure subscription status is accurate (avoiding stale localStorage).
    if (this.token()) {
      this.loadCurrentUser().subscribe({
        error: () => {
          // If profile fetch fails, we might have an invalid token
          if (this.isTokenExpired()) this.logout();
        }
      });
    }
  }

  private getAdjustedNow(): number {
    return Date.now() - this.clockSkew;
  }

  // --- Computed ---
  isAuthenticated = computed(() => !!this.token());


  /**
   * Fetches the current user's profile data.
   */
  loadCurrentUser(): Observable<Pick<Inspector, 'id' | 'email' | 'name'>> {
    return this.http.get<Pick<Inspector, 'id' | 'email' | 'name'>>(`${this.apiUrl}/me`).pipe(
      tap((user) => {
        localStorage.setItem('current_user', JSON.stringify(user));
        this.currentUser.set(user);
      })
    );
  }

  /**
   * Registers a new inspector.
   */
  register(dto: RegisterRequestDto): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/register`, dto);
  }

  /**
   * Verifies an email address using a token.
   */
  verifyEmail(token: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/verify-email`, { token }).pipe(
      tap((response) => this.setSession(response))
    );
  }

  /**
   * Resends the verification email.
   */
  resendVerificationEmail(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/resend-verification`, { email });
  }

  /**
   * Logs in an existing inspector.
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
   * Handles OAuth login by setting tokens and fetching the user profile.
   */
  handleOAuthTokens(accessToken: string, refreshToken: string): Observable<Pick<Inspector, 'id' | 'email' | 'name'>> {
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
    
    this.token.set(accessToken);
    this.refreshTokenSignal.set(refreshToken);

    this.scheduleRefresh();
    
    // Fetch the user data now that tokens are set
    return this.loadCurrentUser();
  }

  /**
   * Clears the session and navigates to login.
   */
  logout() {
    const refreshToken = this.refreshTokenSignal();
    if (refreshToken) {
      this.http.post(`${this.apiUrl}/logout`, { refresh_token: refreshToken }).subscribe();
    }

    this.clearSession();
    this.router.navigate(['/auth/login']);
  }

  /**
   * Requests a password reset link.
   */
  forgotPassword(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/forgot-password`, { email });
  }

  /**
   * Resets the password using a token.
   */
  resetPassword(token: string, password: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/reset-password`, { token, password });
  }

  /**
   * Clears session data without navigation (used for multi-tab sync).
   */
  private clearSession() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('current_user');
    
    this.token.set(null);
    this.refreshTokenSignal.set(null);
    this.currentUser.set(null);

    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }
  }

  /**
   * Attempts to refresh the access token. 
   * Synchronized to prevent multiple simultaneous refresh calls.
   */
  refreshToken(): Observable<AuthResponse> {
    if (this.refreshTokenInProgress$) {
      return this.refreshTokenInProgress$;
    }

    const refreshToken = this.refreshTokenSignal();
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }

    this.refreshTokenInProgress$ = this.http.post<AuthResponse>(`${this.apiUrl}/refresh`, { 
      refresh_token: refreshToken 
    }).pipe(
      tap((response) => this.setSession(response)),
      shareReplay(1),
      finalize(() => {
        this.refreshTokenInProgress$ = undefined;
      })
    );

    return this.refreshTokenInProgress$;
  }

  /**
   * Checks if the current token is expired.
   */
  isTokenExpired(): boolean {
    const token = this.token();
    if (!token) return true;

    const payload = decodeJwt(token);
    if (!payload || !payload.exp) return true;

    const expirationTime = payload.exp * 1000;
    return this.getAdjustedNow() >= expirationTime;
  }

  /**
   * Schedules a proactive token refresh.
   */
  private scheduleRefresh() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    const token = this.token();
    if (!token) return;

    const payload = decodeJwt(token);
    if (!payload || !payload.exp || !payload.iat) return;

    // Update clock skew on every refresh
    this.clockSkew = Date.now() - (payload.iat * 1000);

    const expirationTime = payload.exp * 1000;
    const adjustedNow = this.getAdjustedNow();
    
    // Refresh 1 minute before expiration, or immediately if already close/expired
    const timeout = expirationTime - adjustedNow - (60 * 1000);

    if (timeout > 0) {
      this.refreshTimer = setTimeout(() => {
        this.refreshToken().subscribe({
          error: () => this.logout()
        });
      }, timeout);
    } else {
      this.refreshToken().subscribe({
        error: () => this.logout()
      });
    }
  }

  /**
   * Listens for changes in localStorage from other tabs.
   */
  private listenToStorageEvents() {
    if (isPlatformBrowser(this.platformId)) {
      window.addEventListener('storage', (event) => {
        if (event.key === 'access_token' && !event.newValue) {
          // Token cleared in another tab (logout)
          this.clearSession();
          this.router.navigate(['/auth/login']);
        }
        if (event.key === 'access_token' && event.newValue) {
          // Token updated in another tab (login or refresh)
          this.token.set(event.newValue);
          const userJson = localStorage.getItem('current_user');
          if (userJson) this.currentUser.set(JSON.parse(userJson));
          this.scheduleRefresh();
        }
      });
    }
  }
}

