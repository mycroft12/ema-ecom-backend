import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import {
  CreatePermissionPayload,
  CreateRolePayload,
  CreateUserPayload,
  Permission,
  Role,
  UpdatePermissionPayload,
  UpdateRolePayload,
  UpdateUserPayload,
  User,
} from '../models/access-control.model';
import { Observable } from 'rxjs';

interface RoleIdsRequest {
  roleIds: string[];
}

@Injectable({ providedIn: 'root' })
export class AccessControlService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  // Permissions
  getPermissions(): Observable<Permission[]> {
    return this.http.get<Permission[]>(`${this.baseUrl}/permissions`);
  }

  createPermission(payload: CreatePermissionPayload): Observable<Permission> {
    return this.http.post<Permission>(`${this.baseUrl}/permissions`, payload);
  }

  updatePermission(id: string, payload: UpdatePermissionPayload): Observable<Permission> {
    return this.http.put<Permission>(`${this.baseUrl}/permissions/${id}`, payload);
  }

  deletePermission(id: string, force = false): Observable<void> {
    const options = force ? { params: new HttpParams().set('force', 'true') } : {};
    return this.http.delete<void>(`${this.baseUrl}/permissions/${id}`, options);
  }

  // Roles
  getRoles(): Observable<Role[]> {
    return this.http.get<Role[]>(`${this.baseUrl}/roles`);
  }

  createRole(payload: CreateRolePayload): Observable<Role> {
    return this.http.post<Role>(`${this.baseUrl}/roles`, payload);
  }

  updateRole(id: string, payload: UpdateRolePayload): Observable<Role> {
    return this.http.put<Role>(`${this.baseUrl}/roles/${id}`, payload);
  }

  deleteRole(id: string, force = false): Observable<void> {
    const options = force ? { params: new HttpParams().set('force', 'true') } : {};
    return this.http.delete<void>(`${this.baseUrl}/roles/${id}`, options);
  }

  // Users
  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.baseUrl}/users`);
  }

  createUser(payload: CreateUserPayload): Observable<User> {
    return this.http.post<User>(`${this.baseUrl}/users`, payload);
  }

  updateUser(id: string, payload: UpdateUserPayload): Observable<User> {
    return this.http.put<User>(`${this.baseUrl}/users/${id}`, payload);
  }

  deleteUser(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/users/${id}`);
  }

  attachRolesToUser(userId: string, roleIds: string[]): Observable<User> {
    const body: RoleIdsRequest = { roleIds };
    return this.http.post<User>(`${this.baseUrl}/users/${userId}/roles/attach`, body);
  }

  detachRolesFromUser(userId: string, roleIds: string[]): Observable<User> {
    const body: RoleIdsRequest = { roleIds };
    return this.http.post<User>(`${this.baseUrl}/users/${userId}/roles/detach`, body);
  }
}
