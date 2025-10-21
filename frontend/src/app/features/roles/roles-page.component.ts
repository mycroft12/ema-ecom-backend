import { Component, OnInit, AfterViewInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { Table, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { CheckboxModule } from 'primeng/checkbox';
import { PickListModule } from 'primeng/picklist';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { AccessControlService } from './services/access-control.service';
import { AuthService } from '../../core/auth.service';
import {
  Permission,
  Role,
  User,
  CreatePermissionPayload,
  UpdatePermissionPayload,
  CreateRolePayload,
  UpdateRolePayload,
  CreateUserPayload,
  UpdateUserPayload,
} from './models/access-control.model';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-roles-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    PasswordModule,
    CheckboxModule,
    PickListModule,
    ConfirmDialogModule,
    ToastModule,
    CardModule,
    TagModule,
    FormsModule,
    TranslateModule,
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './roles-page.component.html',
  styleUrls: ['./roles-page.component.scss'],
})
export class RolesPageComponent implements OnInit, AfterViewInit {
  @ViewChild('permissionsTable') permissionsTable?: Table;
  @ViewChild('rolesTable') rolesTable?: Table;
  @ViewChild('usersTable') usersTable?: Table;

  private readonly service = inject(AccessControlService);
  private readonly fb = inject(FormBuilder);
  private readonly confirm = inject(ConfirmationService);
  private readonly messages = inject(MessageService);
  private readonly translate = inject(TranslateService);
  private readonly auth = inject(AuthService);

  permissions: Permission[] = [];
  roles: Role[] = [];
  users: User[] = [];

  permissionFilterValue = '';
  roleFilterValue = '';
  userFilterValue = '';

  permissionsLoading = false;
  rolesLoading = false;
  usersLoading = false;

  // Permission dialog state
  permissionDialogVisible = false;
  permissionForm: FormGroup = this.fb.group({
    name: ['', Validators.required],
  });
  editingPermission: Permission | null = null;

  // Role dialog state
  roleDialogVisible = false;
  roleForm: FormGroup = this.fb.group({
    name: ['', Validators.required],
  });
  editingRole: Role | null = null;

  // User dialog state
  userDialogVisible = false;
  userForm: FormGroup = this.fb.group({
    username: ['', Validators.required],
    email: ['', Validators.email],
    password: [''],
    enabled: [true],
  });
  editingUser: User | null = null;

  // Role-permission picklist state
  rolePermissionsDialogVisible = false;
  rolePickListSource: Permission[] = [];
  rolePickListTarget: Permission[] = [];
  activeRoleForPermissions: Role | null = null;

  // User-role picklist state
  userRolesDialogVisible = false;
  userPickListSource: Role[] = [];
  userPickListTarget: Role[] = [];
  activeUserForRoles: User | null = null;

  ngOnInit(): void {
    this.loadPermissions();
    this.loadRoles();
    this.loadUsers();
  }

  ngAfterViewInit(): void {
    queueMicrotask(() => {
      this.applyPermissionFilter(this.permissionFilterValue);
      this.applyRoleFilter(this.roleFilterValue);
      this.applyUserFilter(this.userFilterValue);
    });
  }

  // --- Data loading ---
  private loadPermissions(): void {
    this.permissionsLoading = true;
    this.service
      .getPermissions()
      .pipe(finalize(() => (this.permissionsLoading = false)))
      .subscribe({
        next: data => {
          this.permissions = data ?? [];
          this.applyPermissionFilter(this.permissionFilterValue);
        },
        error: () => this.showError(this.translate.instant('rolesPage.permissions.errors.load')),
      });
  }

  private loadRoles(): void {
    this.rolesLoading = true;
    this.service
      .getRoles()
      .pipe(finalize(() => (this.rolesLoading = false)))
      .subscribe({
        next: data => {
          this.roles = data ?? [];
          this.applyRoleFilter(this.roleFilterValue);
        },
        error: () => this.showError(this.translate.instant('rolesPage.roles.errors.load')),
      });
  }

  private loadUsers(): void {
    this.usersLoading = true;
    this.service
      .getUsers()
      .pipe(finalize(() => (this.usersLoading = false)))
      .subscribe({
        next: data => {
          this.users = data ?? [];
          this.applyUserFilter(this.userFilterValue);
        },
        error: () => this.showError(this.translate.instant('rolesPage.users.errors.load')),
      });
  }

  // --- Permissions ---
  openPermissionDialog(permission?: Permission): void {
    this.permissionForm.reset({ name: permission?.name ?? '' });
    this.editingPermission = permission ?? null;
    this.permissionDialogVisible = true;
  }

  savePermission(): void {
    if (this.permissionForm.invalid) {
      this.permissionForm.markAllAsTouched();
      return;
    }
    const isEdit = !!this.editingPermission;
    const payload: CreatePermissionPayload | UpdatePermissionPayload = {
      name: this.permissionForm.value.name,
    };
    const request$ = this.editingPermission
      ? this.service.updatePermission(this.editingPermission.id, payload)
      : this.service.createPermission(payload);

    request$.subscribe({
      next: () => {
        const key = isEdit ? 'rolesPage.permissions.toastUpdated' : 'rolesPage.permissions.toastCreated';
        this.showSuccess(this.translate.instant(key));
        this.permissionDialogVisible = false;
        this.editingPermission = null;
        this.loadPermissions();
        this.loadRoles(); // ensure updated relationships
      },
      error: () => {
        const key = isEdit ? 'rolesPage.permissions.errors.update' : 'rolesPage.permissions.errors.create';
        this.showError(this.translate.instant(key));
      },
    });
  }

  confirmDeletePermission(permission: Permission): void {
    this.confirm.confirm({
      header: this.translate.instant('rolesPage.permissions.confirmDelete.header'),
      message: this.translate.instant('rolesPage.permissions.confirmDelete.message', { name: permission.name }),
      acceptLabel: this.translate.instant('rolesPage.permissions.confirmDelete.accept'),
      rejectLabel: this.translate.instant('rolesPage.permissions.confirmDelete.reject'),
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text',
      icon: 'pi pi-exclamation-triangle',
      key: 'dangerConfirm',
      accept: () => this.executePermissionDelete(permission, false),
    });
  }

  private executePermissionDelete(permission: Permission, force: boolean): void {
    this.service.deletePermission(permission.id, force).subscribe({
      next: () => {
        this.showSuccess(this.translate.instant('rolesPage.permissions.toastDeleted'));
        this.loadPermissions();
        this.loadRoles();
      },
      error: (err) => {
        const code = err?.error?.message ?? err?.error ?? err?.message;
        if (!force && code === 'permission.assigned') {
          this.confirm.confirm({
            header: this.translate.instant('rolesPage.permissions.forceDeleteTitle'),
            message: this.translate.instant('rolesPage.permissions.forceDeleteMessage', { name: permission.name }),
            acceptLabel: this.translate.instant('rolesPage.common.forceDelete'),
            rejectLabel: this.translate.instant('rolesPage.common.cancel'),
            acceptButtonStyleClass: 'p-button-danger',
            rejectButtonStyleClass: 'p-button-text',
            icon: 'pi pi-exclamation-triangle',
            key: 'forceConfirm',
            accept: () => this.executePermissionDelete(permission, true),
          });
          return;
        }
        const key = code === 'permission.assigned'
          ? 'rolesPage.permissions.errors.deleteAssigned'
          : 'rolesPage.permissions.errors.delete';
        this.showError(this.translate.instant(key));
      },
    });
  }

  // --- Roles ---
  openRoleDialog(role?: Role): void {
    this.roleForm.reset({ name: role?.name ?? '' });
    this.editingRole = role ?? null;
    this.roleDialogVisible = true;
  }

  saveRole(): void {
    if (this.roleForm.invalid) {
      this.roleForm.markAllAsTouched();
      return;
    }
    const isEdit = !!this.editingRole;
    const nameValue: string = this.roleForm.value.name;
    const createPayload: CreateRolePayload = { name: nameValue };
    const updatePayload: UpdateRolePayload = { name: nameValue };
    const request$ = this.editingRole
      ? this.service.updateRole(this.editingRole.id, updatePayload)
      : this.service.createRole(createPayload);

    request$.subscribe({
      next: () => {
        const key = isEdit ? 'rolesPage.roles.toastUpdated' : 'rolesPage.roles.toastCreated';
        this.showSuccess(this.translate.instant(key));
        this.roleDialogVisible = false;
        this.editingRole = null;
        this.loadRoles();
        this.loadUsers();
      },
      error: () => {
        const key = isEdit ? 'rolesPage.roles.errors.update' : 'rolesPage.roles.errors.create';
        this.showError(this.translate.instant(key));
      },
    });
  }

  confirmDeleteRole(role: Role): void {
    this.confirm.confirm({
      header: this.translate.instant('rolesPage.roles.confirmDelete.header'),
      message: this.translate.instant('rolesPage.roles.confirmDelete.message', { name: role.name }),
      acceptLabel: this.translate.instant('rolesPage.roles.confirmDelete.accept'),
      rejectLabel: this.translate.instant('rolesPage.roles.confirmDelete.reject'),
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text',
      icon: 'pi pi-exclamation-triangle',
      key: 'dangerConfirm',
      accept: () => this.executeRoleDelete(role, false),
    });
  }

  private executeRoleDelete(role: Role, force: boolean): void {
    this.service.deleteRole(role.id, force).subscribe({
      next: () => {
        this.showSuccess(this.translate.instant('rolesPage.roles.toastDeleted'));
        this.loadRoles();
        this.loadUsers();
      },
      error: (err) => {
        const code = err?.error?.message ?? err?.error ?? err?.message;
        if (!force && code === 'role.assigned') {
          this.confirm.confirm({
            header: this.translate.instant('rolesPage.roles.forceDeleteTitle'),
            message: this.translate.instant('rolesPage.roles.forceDeleteMessage', { name: role.name }),
            acceptLabel: this.translate.instant('rolesPage.common.forceDelete'),
            rejectLabel: this.translate.instant('rolesPage.common.cancel'),
            acceptButtonStyleClass: 'p-button-danger',
            rejectButtonStyleClass: 'p-button-text',
            icon: 'pi pi-exclamation-triangle',
            key: 'forceConfirm',
            accept: () => this.executeRoleDelete(role, true),
          });
          return;
        }
        const key = code === 'role.assigned'
          ? 'rolesPage.roles.errors.deleteAssigned'
          : 'rolesPage.roles.errors.delete';
        this.showError(this.translate.instant(key));
      },
    });
  }

  openRolePermissionsDialog(role: Role): void {
    this.activeRoleForPermissions = role;
    const assignedIds = new Set((role.permissions ?? []).map(p => p.id));
    this.rolePickListTarget = (role.permissions ?? []).map(p => ({ ...p }));
    this.rolePickListSource = this.permissions
      .filter(p => !assignedIds.has(p.id))
      .map(p => ({ ...p }));
    this.rolePermissionsDialogVisible = true;
  }

  saveRolePermissions(): void {
    if (!this.activeRoleForPermissions) {
      return;
    }
    const role = this.activeRoleForPermissions;
    const payload: UpdateRolePayload = {
      name: role.name,
      permissions: this.rolePickListTarget.map(p => ({ id: p.id, name: p.name })),
    };
    this.service.updateRole(role.id, payload).subscribe({
      next: () => {
        this.showSuccess(this.translate.instant('rolesPage.roles.toastPermissionsUpdated'));
        this.rolePermissionsDialogVisible = false;
        this.activeRoleForPermissions = null;
        this.loadRoles();
        this.loadUsers();
        this.refreshSessionTokens();
      },
      error: () => this.showError(this.translate.instant('rolesPage.roles.errors.permissions')),
    });
  }

  // --- Users ---
  openUserDialog(user?: User): void {
    this.editingUser = user ?? null;
    const passwordControl = this.userForm.get('password');
    if (user) {
      this.userForm.reset({
        username: user.username,
        email: user.email ?? '',
        password: '',
        enabled: user.enabled,
      });
      passwordControl?.setValidators([Validators.minLength(6)]);
    } else {
      this.userForm.reset({
        username: '',
        email: '',
        password: '',
        enabled: true,
      });
      passwordControl?.setValidators([Validators.required, Validators.minLength(6)]);
    }
    passwordControl?.updateValueAndValidity();
    this.userDialogVisible = true;
  }

  saveUser(): void {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }
    const { username, email, password, enabled } = this.userForm.value;
    const payload: CreateUserPayload | UpdateUserPayload = {
      username,
      email,
      enabled,
    };
    if (!this.editingUser || (password && password.trim().length > 0)) {
      (payload as CreateUserPayload).password = password;
    }
    if (this.editingUser) {
      const updatePayload: UpdateUserPayload = { ...payload };
      if (!password || password.trim().length === 0) {
        delete updatePayload.password;
      }
      this.service.updateUser(this.editingUser.id, updatePayload).subscribe({
        next: () => {
          this.showSuccess(this.translate.instant('rolesPage.users.toastUpdated'));
          this.userDialogVisible = false;
          this.editingUser = null;
          this.loadUsers();
        },
        error: () => this.showError(this.translate.instant('rolesPage.users.errors.update')),
      });
    } else {
      const createPayload: CreateUserPayload = payload as CreateUserPayload;
      this.service.createUser(createPayload).subscribe({
        next: () => {
          this.showSuccess(this.translate.instant('rolesPage.users.toastCreated'));
          this.userDialogVisible = false;
          this.loadUsers();
        },
        error: () => this.showError(this.translate.instant('rolesPage.users.errors.create')),
      });
    }
  }

  confirmDeleteUser(user: User): void {
    this.confirm.confirm({
      header: this.translate.instant('rolesPage.users.confirmDelete.header'),
      message: this.translate.instant('rolesPage.users.confirmDelete.message', { name: user.username }),
      acceptLabel: this.translate.instant('rolesPage.users.confirmDelete.accept'),
      rejectLabel: this.translate.instant('rolesPage.users.confirmDelete.reject'),
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.service.deleteUser(user.id).subscribe({
          next: () => {
            this.showSuccess(this.translate.instant('rolesPage.users.toastDeleted'));
            this.loadUsers();
          },
          error: () => this.showError(this.translate.instant('rolesPage.users.errors.delete')),
        });
      },
    });
  }

  openUserRolesDialog(user: User): void {
    this.activeUserForRoles = user;
    const assignedIds = new Set((user.roles ?? []).map(r => r.id));
    this.userPickListTarget = (user.roles ?? []).map(r => ({ ...r }));
    if (this.userPickListTarget.length > 1) {
      this.userPickListTarget = [this.userPickListTarget[0]];
    }
    this.userPickListSource = this.roles
      .filter(r => !assignedIds.has(r.id))
      .map(r => ({ ...r }));
    this.userRolesDialogVisible = true;
  }

  handleUserRolesMoveToTarget(): void {
    if (this.userPickListTarget.length > 1) {
      const last = this.userPickListTarget[this.userPickListTarget.length - 1];
      this.userPickListTarget = [last];
      this.userPickListSource = this.roles
        .filter(r => r.id !== last.id)
        .map(r => ({ ...r }));
    }
  }

  saveUserRoles(): void {
    if (!this.activeUserForRoles) {
      return;
    }
    const user = this.activeUserForRoles;
    const desiredRoles = this.userPickListTarget.map(r => ({
      id: r.id,
      name: r.name,
      permissions: r.permissions ?? [],
    }));
    const payload: UpdateUserPayload = {
      username: user.username,
      email: user.email,
      enabled: user.enabled,
      roles: desiredRoles,
    };

    this.service.updateUser(user.id, payload).subscribe({
      next: () => {
        this.showSuccess(this.translate.instant('rolesPage.users.toastRolesUpdated'));
        this.userRolesDialogVisible = false;
        this.activeUserForRoles = null;
        this.loadUsers();
      },
      error: () => {
        this.showError(this.translate.instant('rolesPage.users.errors.roles'));
      },
    });
  }

  applyPermissionFilter(value: string): void {
    const term = (value ?? '').trim();
    this.permissionsTable?.filterGlobal(term, 'contains');
  }

  applyRoleFilter(value: string): void {
    const term = (value ?? '').trim();
    this.rolesTable?.filterGlobal(term, 'contains');
  }

  applyUserFilter(value: string): void {
    const term = (value ?? '').trim();
    this.usersTable?.filterGlobal(term, 'contains');
  }

  private refreshSessionTokens(): void {
    const refresh$ = this.auth.refreshAccessToken();
    refresh$.subscribe({
      next: tokens => {
        if (tokens) {
          this.auth.saveLoginResponse(tokens);
        }
      },
      error: () => {
        // ignore refresh failures silently
      }
    });
  }

  // --- Helpers ---
  trackById<T extends { id: string }>(_index: number, item: T): string {
    return item.id;
  }

  private showSuccess(detail: string): void {
    this.messages.add({
      severity: 'success',
      summary: this.translate.instant('rolesPage.common.toastSuccess'),
      detail
    });
  }

  private showError(detail: string): void {
    this.messages.add({
      severity: 'error',
      summary: this.translate.instant('rolesPage.common.toastError'),
      detail
    });
  }

  getRolePermissionTooltip(role: Role): string | null {
    const perms = role.permissions ?? [];
    return perms.map(p => p.name).join(', ');
  }

  getRolePermissionsDisplay(role: Role): Permission[] {
    const perms = role.permissions ?? [];
    return perms.slice(0, 8);
  }

  getRolePermissionsOverflow(role: Role): number {
    const total = role.permissions?.length ?? 0;
    return total > 8 ? total - 8 : 0;
  }

  getUserRolesTooltip(user: User): string | null {
    const roles = user.roles ?? [];
    return roles.map(r => r.name).join(', ');
  }

  getUserRolesDisplay(user: User): Role[] {
    const roles = user.roles ?? [];
    return roles.slice(0, 8);
  }

  getUserRolesOverflow(user: User): number {
    const total = user.roles?.length ?? 0;
    return total > 8 ? total - 8 : 0;
  }
}
