import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { jwtDecode } from 'jwt-decode';

interface LoginRequest { username: string; password: string; }
interface LoginResponse { accessToken: string; refreshToken: string; }
interface JwtPayload { sub: string; roles?: string[]; permissions?: string[]; name?: string; exp?: number; username?: string; preferred_username?: string; }

@Injectable({ providedIn: 'root' })
export class AuthService {
  private tokenKey = 'ema_token';
  private refreshTokenKey = 'ema_refresh_token';

  constructor(private http: HttpClient) {}

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

  saveRefreshToken(token: string){ localStorage.setItem(this.refreshTokenKey, token); }
  getRefreshToken(): string | null { return localStorage.getItem(this.refreshTokenKey); }

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

  logout(){ 
    localStorage.removeItem(this.tokenKey); 
    localStorage.removeItem(this.refreshTokenKey);
    window.location.href = '/login'; 
  }
  isAuthenticated(): boolean { const t = this.getToken(); if(!t) return false; try{ const d = jwtDecode<JwtPayload>(t); return !this.isExpired(d); }catch{ return false; } }
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
      console.log('No token found');
      return []; 
    } 
    try { 
      const d = jwtDecode<JwtPayload>(t); 
      console.log('Decoded token:', d);
      console.log('Permissions from token:', d.permissions);
      return d.permissions || []; 
    } catch(e) { 
      console.error('Error decoding token:', e);
      return []; 
    } 
  }

  hasAny(perms: string[]): boolean { 
    console.log('Checking permissions:', perms);
    const p = this.permissions(); 
    console.log('User permissions:', p);
    const result = perms.some(x => p.includes(x));
    console.log('Has any permissions:', result);
    return result; 
  }
}
