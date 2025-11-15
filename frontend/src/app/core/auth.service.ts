import { Injectable, NgZone, Signal, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { jwtDecode } from 'jwt-decode';
import { Observable, firstValueFrom, of } from 'rxjs';
import { catchError, map, timeout } from 'rxjs/operators';
import { Router } from '@angular/router';

interface LoginRequest { username: string; password: string; }
interface LoginResponse { accessToken: string; refreshToken: string; }
interface JwtPayload { sub: string; roles?: string[]; permissions?: string[]; name?: string; exp?: number; username?: string; preferred_username?: string; }

@Injectable({ providedIn: 'root' })
export class AuthService {
  private tokenKey = 'ema_token';
  private refreshTokenKey = 'ema_refresh_token';
  private logoutMessageKey = 'ema_logout_message';
  private readonly refreshTimestampKey = 'ema_refresh_timestamp';
  readonly STALE_MAX_AGE_MS = 5 * 60 * 1000;
  private refreshTokenSnapshot: string | null = null;
  private readonly permissionsSig = signal<string[]>([]);
  private readonly rolesSig = signal<string[]>([]);

  constructor(private http: HttpClient, private router: Router, private zone: NgZone) {
    this.refreshTokenSnapshot = this.peekRefreshToken();
    this.updatePermissionsFromToken(this.peekToken());
  }

  login(username: string, password: string){
    return this.http.post<LoginResponse>(`${environment.apiBase}/api/auth/login`, { username, password });
  }

  saveLoginResponse(response: LoginResponse) {
    this.saveToken(response.accessToken);
    this.saveRefreshToken(response.refreshToken);
    this.markRefreshed();
  }

  saveToken(token: string){
    localStorage.setItem(this.tokenKey, token);
    this.updatePermissionsFromToken(token);
  }
  getToken(): string | null { return this.peekToken(); }

  private peekToken(): string | null {
    try {
      return localStorage.getItem(this.tokenKey);
    } catch {
      return null;
    }
  }

  saveRefreshToken(token: string){
    localStorage.setItem(this.refreshTokenKey, token);
    this.refreshTokenSnapshot = token;
  }
  getLastRefreshTimestamp(): number {
    try {
      const raw = localStorage.getItem(this.refreshTimestampKey);
      if (!raw) {
        return 0;
      }
      const parsed = Number(raw);
      return Number.isNaN(parsed) ? 0 : parsed;
    } catch {
      return 0;
    }
  }
  private markRefreshed(timestamp: number = Date.now()): void {
    try {
      localStorage.setItem(this.refreshTimestampKey, String(timestamp));
    } catch {
      /* ignore */
    }
  }
  private clearRefreshTimestamp(): void {
    try {
      localStorage.removeItem(this.refreshTimestampKey);
    } catch {
      /* ignore */
    }
  }
  isRefreshStale(): boolean {
    const ts = this.getLastRefreshTimestamp();
    if (!ts) {
      return true;
    }
    return Date.now() - ts > this.STALE_MAX_AGE_MS;
  }
  async initAutoSession(): Promise<void> {
    const refreshToken = this.peekRefreshToken();
    const accessToken = this.peekToken();
    if (!refreshToken) {
      if (!accessToken) {
        this.clearRefreshTimestamp();
      }
      return;
    }

    let needsRefresh = false;
    if (!accessToken) {
      needsRefresh = true;
    } else {
      try {
        const payload = jwtDecode<JwtPayload>(accessToken);
        if (!payload || this.isExpired(payload)) {
          needsRefresh = true;
        }
      } catch {
        needsRefresh = true;
      }
    }
    if (!needsRefresh && this.isRefreshStale()) {
      needsRefresh = true;
    }
    if (!needsRefresh) {
      return;
    }
    const refreshed = await this.tryRefreshWithTimeout();
    if (!refreshed) {
      this.forceLogoutToLogin('auth.errors.reconnect');
    }
  }
  async tryRefreshWithTimeout(timeoutMs = 5000): Promise<boolean> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return false;
    }
    try {
      const response = await firstValueFrom(this.refreshAccessToken().pipe(timeout(timeoutMs)));
      this.saveLoginResponse(response);
      return true;
    } catch (_error) {
      return false;
    }
  }
  forceLogoutToLogin(messageKey: string = 'auth.errors.reconnect'): void {
    this.logout(messageKey);
  }
  handleTransportError(error: HttpErrorResponse): void {
    if (error.status === 0 && this.isAuthenticated() && this.isRefreshStale()) {
      this.forceLogoutToLogin('auth.errors.reconnect');
    }
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
    const refreshToken = this.getRefreshToken();
    if (refreshToken) {
      this.http.post(`${environment.apiBase}/api/auth/logout`, { refreshToken }).subscribe({
        next: () => {},
        error: () => {}
      });
    }
    if (messageKey) {
      try { localStorage.setItem(this.logoutMessageKey, messageKey); } catch { /* ignore */ }
    } else {
      try { localStorage.removeItem(this.logoutMessageKey); } catch { /* ignore */ }
    }
    localStorage.removeItem(this.tokenKey); 
    localStorage.removeItem(this.refreshTokenKey);
    this.clearRefreshTimestamp();
    this.refreshTokenSnapshot = null;
    this.permissionsSig.set([]);
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
    return this.permissionsSig();
  }

  permissionsSignal(): Signal<string[]> {
    return this.permissionsSig.asReadonly();
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

  roles(): string[] {
    return this.rolesSig();
  }

  hasRole(role: string | string[]): boolean {
    const roles = this.rolesSig().map(r => r.toLowerCase());
    if (Array.isArray(role)) {
      return role.some(r => roles.includes(r.toLowerCase()));
    }
    return roles.includes(role.toLowerCase());
  }

  hasAny(perms: string[]): boolean {
    const p = this.permissionsSig(); 
    const result = perms.some(x => p.includes(x));
    return result; 
  }

  private updatePermissionsFromToken(token: string | null): void {
    if (!token) {
      this.permissionsSig.set([]);
       this.rolesSig.set([]);
      return;
    }
    try {
      const decoded = jwtDecode<JwtPayload>(token);
      const perms = decoded.permissions ? Array.from(new Set(decoded.permissions)) : [];
      this.permissionsSig.set(perms);
      const roles = decoded.roles ? Array.from(new Set(decoded.roles)) : [];
      this.rolesSig.set(roles);
    } catch {
      this.permissionsSig.set([]);
      this.rolesSig.set([]);
    }
  }
}
