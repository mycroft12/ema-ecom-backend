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
  private readonly baseUrl = environment.apiBase;

  // Permissions
  getPermissions(): Observable<Permission[]> {
    return this.http.get<Permission[]>(`${this.baseUrl}/api/permissions`);
  }

  createPermission(payload: CreatePermissionPayload): Observable<Permission> {
    return this.http.post<Permission>(`${this.baseUrl}/api/permissions`, payload);
  }

  updatePermission(id: string, payload: UpdatePermissionPayload): Observable<Permission> {
    return this.http.put<Permission>(`${this.baseUrl}/api/permissions/${id}`, payload);
  }

  deletePermission(id: string, force = false): Observable<void> {
    const options = force ? { params: new HttpParams().set('force', 'true') } : {};
    return this.http.delete<void>(`${this.baseUrl}/api/permissions/${id}`, options);
  }

  // Roles
  getRoles(): Observable<Role[]> {
    return this.http.get<Role[]>(`${this.baseUrl}/api/roles`);
  }

  createRole(payload: CreateRolePayload): Observable<Role> {
    return this.http.post<Role>(`${this.baseUrl}/api/roles`, payload);
  }

  updateRole(id: string, payload: UpdateRolePayload): Observable<Role> {
    return this.http.put<Role>(`${this.baseUrl}/api/roles/${id}`, payload);
  }

  deleteRole(id: string, force = false): Observable<void> {
    const options = force ? { params: new HttpParams().set('force', 'true') } : {};
    return this.http.delete<void>(`${this.baseUrl}/api/roles/${id}`, options);
  }

  // Users
  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.baseUrl}/api/users`);
  }

  createUser(payload: CreateUserPayload): Observable<User> {
    return this.http.post<User>(`${this.baseUrl}/api/users`, payload);
  }

  updateUser(id: string, payload: UpdateUserPayload): Observable<User> {
    return this.http.put<User>(`${this.baseUrl}/api/users/${id}`, payload);
  }

  deleteUser(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/api/users/${id}`);
  }

  attachRolesToUser(userId: string, roleIds: string[]): Observable<User> {
    const body: RoleIdsRequest = { roleIds };
    return this.http.post<User>(`${this.baseUrl}/api/users/${userId}/roles/attach`, body);
  }

  detachRolesFromUser(userId: string, roleIds: string[]): Observable<User> {
    const body: RoleIdsRequest = { roleIds };
    return this.http.post<User>(`${this.baseUrl}/api/users/${userId}/roles/detach`, body);
  }
}
