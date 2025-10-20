export interface Permission {
  id: string;
  name: string;
}

export interface Role {
  id: string;
  name: string;
  permissions: Permission[];
}

export interface User {
  id: string;
  username: string;
  email?: string;
  enabled: boolean;
  roles: Role[];
}

export interface CreatePermissionPayload {
  name: string;
}

export interface UpdatePermissionPayload {
  name: string;
}

export interface CreateRolePayload {
  name: string;
  permissions?: Permission[];
}

export interface UpdateRolePayload {
  name?: string;
  permissions?: Permission[];
}

export interface CreateUserPayload {
  username: string;
  email?: string;
  password: string;
  enabled: boolean;
  roles?: Role[];
}

export interface UpdateUserPayload {
  username?: string;
  email?: string;
  password?: string;
  enabled?: boolean;
  roles?: Role[];
}
