import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { PickListModule } from 'primeng/picklist';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ConfirmationService, MessageService } from 'primeng/api';
import { AccessControlService } from './services/access-control.service';
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
import { Observable, concat, finalize, of } from 'rxjs';
import { map } from 'rxjs/operators';

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
    CheckboxModule,
    PickListModule,
    ConfirmDialogModule,
    ToastModule,
    CardModule,
    TagModule,
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './roles-page.component.html',
  styleUrls: ['./roles-page.component.scss'],
})
export class RolesPageComponent implements OnInit {
  private readonly service = inject(AccessControlService);
  private readonly fb = inject(FormBuilder);
  private readonly confirm = inject(ConfirmationService);
  private readonly messages = inject(MessageService);

  permissions: Permission[] = [];
  roles: Role[] = [];
  users: User[] = [];

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

  // --- Data loading ---
  private loadPermissions(): void {
    this.permissionsLoading = true;
    this.service
      .getPermissions()
      .pipe(finalize(() => (this.permissionsLoading = false)))
      .subscribe({
        next: data => (this.permissions = data ?? []),
        error: () => this.showError('Failed to fetch permissions'),
      });
  }

  private loadRoles(): void {
    this.rolesLoading = true;
    this.service
      .getRoles()
      .pipe(finalize(() => (this.rolesLoading = false)))
      .subscribe({
        next: data => (this.roles = data ?? []),
        error: () => this.showError('Failed to fetch roles'),
      });
  }

  private loadUsers(): void {
    this.usersLoading = true;
    this.service
      .getUsers()
      .pipe(finalize(() => (this.usersLoading = false)))
      .subscribe({
        next: data => (this.users = data ?? []),
        error: () => this.showError('Failed to fetch users'),
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
    const payload: CreatePermissionPayload | UpdatePermissionPayload = {
      name: this.permissionForm.value.name,
    };
    const request$ = this.editingPermission
      ? this.service.updatePermission(this.editingPermission.id, payload)
      : this.service.createPermission(payload);

    request$.subscribe({
      next: () => {
        this.showSuccess(`Permission ${this.editingPermission ? 'updated' : 'created'} successfully`);
        this.permissionDialogVisible = false;
        this.editingPermission = null;
        this.loadPermissions();
        this.loadRoles(); // ensure updated relationships
      },
      error: () => this.showError(`Failed to ${this.editingPermission ? 'update' : 'create'} permission`),
    });
  }

  confirmDeletePermission(permission: Permission): void {
    this.confirm.confirm({
      message: `Delete permission "${permission.name}"?`,
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.service.deletePermission(permission.id).subscribe({
          next: () => {
            this.showSuccess('Permission deleted');
            this.loadPermissions();
            this.loadRoles();
          },
          error: () => this.showError('Failed to delete permission'),
        });
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
    const nameValue: string = this.roleForm.value.name;
    const createPayload: CreateRolePayload = { name: nameValue };
    const updatePayload: UpdateRolePayload = { name: nameValue };
    const request$ = this.editingRole
      ? this.service.updateRole(this.editingRole.id, updatePayload)
      : this.service.createRole(createPayload);

    request$.subscribe({
      next: () => {
        this.showSuccess(`Role ${this.editingRole ? 'updated' : 'created'} successfully`);
        this.roleDialogVisible = false;
        this.editingRole = null;
        this.loadRoles();
        this.loadUsers();
      },
      error: () => this.showError(`Failed to ${this.editingRole ? 'update' : 'create'} role`),
    });
  }

  confirmDeleteRole(role: Role): void {
    this.confirm.confirm({
      message: `Delete role "${role.name}"?`,
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.service.deleteRole(role.id).subscribe({
          next: () => {
            this.showSuccess('Role deleted');
            this.loadRoles();
            this.loadUsers();
          },
          error: () => this.showError('Failed to delete role'),
        });
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
        this.showSuccess('Role permissions updated');
        this.rolePermissionsDialogVisible = false;
        this.activeRoleForPermissions = null;
        this.loadRoles();
        this.loadUsers();
      },
      error: () => this.showError('Failed to update role permissions'),
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
          this.showSuccess('User updated successfully');
          this.userDialogVisible = false;
          this.editingUser = null;
          this.loadUsers();
        },
        error: () => this.showError('Failed to update user'),
      });
    } else {
      const createPayload: CreateUserPayload = payload as CreateUserPayload;
      this.service.createUser(createPayload).subscribe({
        next: () => {
          this.showSuccess('User created successfully');
          this.userDialogVisible = false;
          this.loadUsers();
        },
        error: () => this.showError('Failed to create user'),
      });
    }
  }

  confirmDeleteUser(user: User): void {
    this.confirm.confirm({
      message: `Delete user "${user.username}"?`,
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.service.deleteUser(user.id).subscribe({
          next: () => {
            this.showSuccess('User deleted');
            this.loadUsers();
          },
          error: () => this.showError('Failed to delete user'),
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
    const desiredIds = new Set(this.userPickListTarget.map(r => r.id));
    const currentIds = new Set((user.roles ?? []).map(r => r.id));

    const toAttach = Array.from(desiredIds).filter(id => !currentIds.has(id));
    const toDetach = Array.from(currentIds).filter(id => !desiredIds.has(id));

    if (toAttach.length === 0 && toDetach.length === 0) {
      this.userRolesDialogVisible = false;
      this.activeUserForRoles = null;
      return;
    }

    const operations: Observable<unknown>[] = [];

    if (toAttach.length) {
      operations.push(
        this.service.attachRolesToUser(user.id, toAttach).pipe(map(() => null)),
      );
    }

    if (toDetach.length) {
      operations.push(
        this.service.detachRolesFromUser(user.id, toDetach).pipe(map(() => null)),
      );
    }

    const sequence$ = operations.length ? concat(...operations) : of(null);

    sequence$.subscribe({
      next: () => {
        this.showSuccess('User roles updated');
        this.userRolesDialogVisible = false;
        this.activeUserForRoles = null;
        this.loadUsers();
      },
      error: () => {
        this.showError('Failed to update user roles');
      },
    });
  }

  // --- Helpers ---
  trackById<T extends { id: string }>(_index: number, item: T): string {
    return item.id;
  }

  private showSuccess(detail: string): void {
    this.messages.add({ severity: 'success', summary: 'Success', detail });
  }

  private showError(detail: string): void {
    this.messages.add({ severity: 'error', summary: 'Error', detail });
  }

  getRolePermissionTooltip(role: Role): string | null {
    const perms = role.permissions ?? [];
    if (perms.length <= 10) {
      return null;
    }
    return perms.map(p => p.name).join(', ');
  }

  getRolePermissionsDisplay(role: Role): Permission[] {
    const perms = role.permissions ?? [];
    return perms.slice(0, 10);
  }

  getRolePermissionsOverflow(role: Role): number {
    const total = role.permissions?.length ?? 0;
    return total > 10 ? total - 10 : 0;
  }
}
