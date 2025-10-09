import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { jwtDecode } from 'jwt-decode';

interface LoginRequest { username: string; password: string; }
interface LoginResponse { accessToken: string; }
interface JwtPayload { sub: string; roles?: string[]; permissions?: string[]; name?: string; exp?: number; }

@Injectable({ providedIn: 'root' })
export class AuthService {
  private tokenKey = 'ema_token';

  constructor(private http: HttpClient) {}

  login(username: string, password: string){
    return this.http.post<LoginResponse>(`${environment.apiBase}/api/auth/login`, { username, password });
  }

  saveToken(token: string){ localStorage.setItem(this.tokenKey, token); }
  getToken(): string | null { return localStorage.getItem(this.tokenKey); }
  logout(){ localStorage.removeItem(this.tokenKey); window.location.href = '/login'; }
  isAuthenticated(): boolean { const t = this.getToken(); if(!t) return false; try{ const d = jwtDecode<JwtPayload>(t); return !this.isExpired(d); }catch{ return false; } }
  private isExpired(d: JwtPayload){ return !!d.exp && d.exp * 1000 < Date.now(); }
  username(): string { const t = this.getToken(); if(!t) return ''; try{ const d = jwtDecode<JwtPayload>(t); return d.name || d.sub; }catch{ return ''; } }
  permissions(): string[] { const t = this.getToken(); if(!t) return []; try{ const d = jwtDecode<JwtPayload>(t); return d.permissions || []; }catch{ return []; } }
  hasAny(perms: string[]): boolean { const p = this.permissions(); return perms.some(x => p.includes(x)); }
}
