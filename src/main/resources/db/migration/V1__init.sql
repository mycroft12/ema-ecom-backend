create extension if not exists pgcrypto; -- for gen_random_uuid()

create table permissions (
  id uuid primary key,
  created_at timestamp not null,
  updated_at timestamp not null,
  name varchar(128) unique not null,
  description varchar(512)
);
create table roles (
  id uuid primary key,
  created_at timestamp not null,
  updated_at timestamp not null,
  name varchar(64) unique not null
);
create table roles_permissions (
  role_id uuid not null references roles(id) on delete cascade,
  permission_id uuid not null references permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);
create table users (
  id uuid primary key,
  created_at timestamp not null,
  updated_at timestamp not null,
  username varchar(128) unique not null,
  password varchar(255) not null,
  enabled boolean not null
);
create table users_roles (
  user_id uuid not null references users(id) on delete cascade,
  role_id uuid not null references roles(id) on delete cascade,
  primary key (user_id, role_id)
);
create table refresh_tokens (
  id uuid primary key,
  created_at timestamp not null,
  updated_at timestamp not null,
  token varchar(255) unique not null,
  user_id uuid not null references users(id) on delete cascade,
  expires_at timestamp not null,
  revoked boolean not null
);
create table employees (
  id uuid primary key,
  created_at timestamp not null,
  updated_at timestamp not null,
  first_name varchar(128) not null,
  last_name varchar(128) not null,
  type varchar(32) not null,
  company_name varchar(256),
  phone varchar(64),
  email varchar(256)
);
create table products (
  id uuid primary key,
  created_at timestamp not null,
  updated_at timestamp not null,
  name varchar(256) not null,
  description text,
  price numeric(18,2) not null,
  photo_url varchar(512),
  active boolean not null
);
create table rules (
  id uuid primary key,
  created_at timestamp not null,
  updated_at timestamp not null,
  name varchar(256) not null,
  type varchar(64) not null,
  expression text not null,
  active boolean not null
);

-- seed permissions
insert into permissions (id, created_at, updated_at, name, description) values
  (gen_random_uuid(), now(), now(), 'employee:read',''),
  (gen_random_uuid(), now(), now(), 'employee:create',''),
  (gen_random_uuid(), now(), now(), 'employee:update',''),
  (gen_random_uuid(), now(), now(), 'employee:delete',''),
  (gen_random_uuid(), now(), now(), 'product:read',''),
  (gen_random_uuid(), now(), now(), 'product:create',''),
  (gen_random_uuid(), now(), now(), 'product:update',''),
  (gen_random_uuid(), now(), now(), 'product:delete',''),
  (gen_random_uuid(), now(), now(), 'rule:read',''),
  (gen_random_uuid(), now(), now(), 'rule:create',''),
  (gen_random_uuid(), now(), now(), 'rule:update',''),
  (gen_random_uuid(), now(), now(), 'rule:delete',''),
  (gen_random_uuid(), now(), now(), 'rule:evaluate',''),
  (gen_random_uuid(), now(), now(), 'role:read',''),
  (gen_random_uuid(), now(), now(), 'role:create',''),
  (gen_random_uuid(), now(), now(), 'role:update',''),
  (gen_random_uuid(), now(), now(), 'role:delete',''),
  (gen_random_uuid(), now(), now(), 'permission:read',''),
  (gen_random_uuid(), now(), now(), 'permission:create',''),
  (gen_random_uuid(), now(), now(), 'permission:update',''),
  (gen_random_uuid(), now(), now(), 'permission:delete','');

insert into roles (id, created_at, updated_at, name) values (gen_random_uuid(), now(), now(), 'ADMIN');
insert into roles_permissions (role_id, permission_id) select r.id, p.id from roles r cross join permissions p where r.name='ADMIN';

-- admin / password = admin (bcrypt)
insert into users (id, created_at, updated_at, username, password, enabled)
values (gen_random_uuid(), now(), now(), 'admin', '$2a$10$y5YvE0n8L5gq3bA2c3LqUuZ4bXz4YkY3XG2K3v1gI6KQf0v0Vd4ai', true);
insert into users_roles (user_id, role_id) select u.id, r.id from users u, roles r where u.username='admin' and r.name='ADMIN';
