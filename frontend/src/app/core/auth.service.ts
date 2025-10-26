import { Injectable, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { jwtDecode } from 'jwt-decode';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Router } from '@angular/router';

interface LoginRequest { username: string; password: string; }
interface LoginResponse { accessToken: string; refreshToken: string; }
interface JwtPayload { sub: string; roles?: string[]; permissions?: string[]; name?: string; exp?: number; username?: string; preferred_username?: string; }

@Injectable({ providedIn: 'root' })
export class AuthService {
  private tokenKey = 'ema_token';
  private refreshTokenKey = 'ema_refresh_token';
  private logoutMessageKey = 'ema_logout_message';
  private refreshTokenSnapshot: string | null = null;

  constructor(private http: HttpClient, private router: Router, private zone: NgZone) {
    this.refreshTokenSnapshot = this.peekRefreshToken();
  }

  login(username: string, password: string){
    return this.http.post<LoginResponse>(`${environment.apiBase}/api/auth/login`, { username, password });
  }

  saveLoginResponse(response: LoginResponse) {
    this.saveToken(response.accessToken);
    this.saveRefreshToken(response.refreshToken);
  }

  forgotPassword(identifier: string){
    return this.http.post<void>(`${environment.apiBase}/api/auth/forgot-password`, { identifier });
  }

  saveToken(token: string){ localStorage.setItem(this.tokenKey, token); }
  getToken(): string | null { return localStorage.getItem(this.tokenKey); }

  saveRefreshToken(token: string){
    localStorage.setItem(this.refreshTokenKey, token);
    this.refreshTokenSnapshot = token;
  }
  private peekRefreshToken(): string | null {
    try {
      return localStorage.getItem(this.refreshTokenKey);
    } catch {
      return null;
    }
  }
  getRefreshToken(): string | null {
    const value = this.peekRefreshToken();
    this.refreshTokenSnapshot = value;
    return value;
  }
  hasConsistentRefreshToken(): boolean {
    const stored = this.peekRefreshToken();
    if (!stored) {
      return false;
    }
    if (this.refreshTokenSnapshot && this.refreshTokenSnapshot !== stored) {
      return false;
    }
    this.refreshTokenSnapshot = stored;
    return true;
  }

  refreshAccessToken() {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    return this.http.post<LoginResponse>(
      `${environment.apiBase}/api/auth/refresh`, 
      { refreshToken }
    );
  }

  ensureAuthenticated(): Observable<boolean> {
    const token = this.getToken();
    if (!token) {
      return of(false);
    }

    let payload: JwtPayload | null = null;
    try {
      payload = jwtDecode<JwtPayload>(token);
    } catch {
      return of(false);
    }

    if (payload && !this.isExpired(payload)) {
      return of(true);
    }

    if (!this.getRefreshToken()) {
      return of(false);
    }

    return this.refreshAccessToken().pipe(
        map(response => {
          this.saveLoginResponse(response);
          return true;
        }),
        catchError(() => of(false))
    );
  }

  logout(messageKey?: string){
    if (messageKey) {
      try { localStorage.setItem(this.logoutMessageKey, messageKey); } catch { /* ignore */ }
    } else {
      try { localStorage.removeItem(this.logoutMessageKey); } catch { /* ignore */ }
    }
    localStorage.removeItem(this.tokenKey); 
    localStorage.removeItem(this.refreshTokenKey);
    this.refreshTokenSnapshot = null;
    const navigate = () => this.router.navigateByUrl('/login').catch(() => { window.location.href = '/login'; });
    if (this.zone) {
      this.zone.run(() => navigate());
    } else {
      navigate();
    }
  }
  isAuthenticated(): boolean { 
    const t = this.getToken(); 
    if(!t) return false; 
    try{ 
      const d = jwtDecode<JwtPayload>(t); 
      if (this.isExpired(d)) {
        return !!this.getRefreshToken();
      }
      return true;
    }catch{ 
      return false; 
    } 
  }
  private isExpired(d: JwtPayload){ return !!d.exp && d.exp * 1000 < Date.now(); }
  username(): string { 
    const t = this.getToken(); 
    if(!t) return ''; 
    try{ 
      const d = jwtDecode<JwtPayload>(t) as JwtPayload & Record<string, any>; 
      return d.name || d.username || d.preferred_username || d.sub; 
    }catch{ 
      return ''; 
    } 
  }
  permissions(): string[] { 
    const t = this.getToken(); 
    if(!t) {
      return []; 
    } 
    try { 
      const d = jwtDecode<JwtPayload>(t); 
      return d.permissions || []; 
    } catch(e) { 
      return []; 
    } 
  }

  consumeLogoutMessage(): string | null {
    let messageKey: string | null = null;
    try {
      messageKey = localStorage.getItem(this.logoutMessageKey);
      if (messageKey) {
        localStorage.removeItem(this.logoutMessageKey);
      }
    } catch {
      messageKey = null;
    }
    return messageKey;
  }

  hasAny(perms: string[]): boolean { 
    const p = this.permissions(); 
    const result = perms.some(x => p.includes(x));
    return result; 
  }
}
