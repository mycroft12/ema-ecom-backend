package com.mycroft.ema.ecom.auth.service;

import com.mycroft.ema.ecom.auth.domain.Role;
import com.mycroft.ema.ecom.auth.domain.User;
import com.mycroft.ema.ecom.auth.repo.RoleRepository;
import com.mycroft.ema.ecom.auth.repo.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * Dev-only initializer to ensure the admin user and minimal auth schema exist.
 * - Creates minimal tables if missing (users, roles, permissions, join tables)
 * - Creates ADMIN role if missing
 * - Creates admin user with configured credentials if missing; resets password if changed
 * It does NOT run in production profiles.
 */
@Component
@Profile("dev")
@org.springframework.core.annotation.Order(100)
public class DevAdminInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DevAdminInitializer.class);

    private final UserRepository users;
    private final RoleRepository roles;
    private final PasswordEncoder encoder;
    private final JdbcTemplate jdbc;
    private final org.springframework.transaction.support.TransactionTemplate txTemplate;

    @Value("${app.auth.admin.username:admin}")
    private String adminUsername;
    @Value("${app.auth.admin.password:admin}")
    private String adminPassword;

    public DevAdminInitializer(UserRepository users, RoleRepository roles, PasswordEncoder encoder, JdbcTemplate jdbc,
                               org.springframework.transaction.PlatformTransactionManager txManager) {
        this.users = users;
        this.roles = roles;
        this.encoder = encoder;
        this.jdbc = jdbc;
        this.txTemplate = new org.springframework.transaction.support.TransactionTemplate(txManager);
    }

    @Override
    public void run(String... args) {
        txTemplate.execute(status -> {
            ensureSchema();
            ensureAdmin();
            return null;
        });
    }

    private void addForeignKeyIfMissing(String table, String constraintName, String column, String refTable, String refColumn, String onDelete) {
        Boolean exists = jdbc.queryForObject("select exists(select 1 from pg_constraint where conname = ?)", Boolean.class, constraintName);
        if (exists == null || !exists) {
            String sql = String.format("alter table %s add constraint %s foreign key (%s) references %s(%s)%s",
                    table, constraintName, column, refTable, refColumn, (onDelete != null ? " on delete " + onDelete : ""));
            jdbc.execute(sql);
        }
    }

    private void ensureSchema(){
        // Create tables if they do not exist (id UUID, audit fields, minimal columns)
        // Note: we keep DDL minimal and idempotent for dev.
        jdbc.execute("create extension if not exists pgcrypto");
        // Define IDs without DB-specific UUID defaults to avoid extension dependency
        jdbc.execute("create table if not exists roles (id uuid primary key, created_at timestamp not null default now(), updated_at timestamp not null default now(), name varchar(128) unique not null)");
        jdbc.execute("create table if not exists permissions (id uuid primary key, created_at timestamp not null default now(), updated_at timestamp not null default now(), name varchar(255) unique not null)");
        jdbc.execute("create table if not exists users (id uuid primary key, created_at timestamp not null default now(), updated_at timestamp not null default now(), username varchar(128) unique not null, email varchar(255) unique, password varchar(255) not null, enabled boolean not null default true)");
        jdbc.execute("create table if not exists roles_permissions (role_id uuid not null, permission_id uuid not null, primary key (role_id, permission_id))");
        jdbc.execute("create table if not exists users_roles (user_id uuid not null, role_id uuid not null, primary key (user_id, role_id))");
        // Refresh tokens table (used by auth service)
        jdbc.execute("create table if not exists refresh_tokens (id uuid primary key, created_at timestamp not null default now(), updated_at timestamp not null default now(), token text not null unique, revoked boolean not null default false, expires_at timestamp not null, user_id uuid not null)");
        // Add FKs if missing without causing transaction aborts (check catalog to avoid errors)
        addForeignKeyIfMissing("roles_permissions", "fk_rp_role", "role_id", "roles", "id", null);
        addForeignKeyIfMissing("roles_permissions", "fk_rp_perm", "permission_id", "permissions", "id", null);
        addForeignKeyIfMissing("users_roles", "fk_ur_user", "user_id", "users", "id", null);
        addForeignKeyIfMissing("users_roles", "fk_ur_role", "role_id", "roles", "id", null);
        addForeignKeyIfMissing("refresh_tokens", "fk_rt_user", "user_id", "users", "id", "cascade");
        // Useful indexes
        try { jdbc.execute("create index if not exists idx_refresh_tokens_user_id on refresh_tokens(user_id)"); } catch (Exception ignored) {}
        try { jdbc.execute("create index if not exists idx_refresh_tokens_token on refresh_tokens(token)"); } catch (Exception ignored) {}

        // Seed a minimal set of permissions for admin (idempotent)
        String[] basePerms = new String[]{
            "user:read","user:create","user:update","user:delete",
            "product:read","product:create","product:update","product:delete",
            "orders:read","orders:create","orders:update","orders:delete",
            "expenses:read","expenses:create","expenses:update","expenses:delete",
            "ads:read","ads:create","ads:update","ads:delete",
            "product:action:export:excel",
            "import:template","import:configure"
        };
        for (String p : basePerms){
            jdbc.update("INSERT INTO permissions(id, name) VALUES (?, ?) ON CONFLICT (name) DO NOTHING", UUID.randomUUID(), p);
        }

        // Ensure ADMIN role exists
        jdbc.update("INSERT INTO roles(id, name) VALUES (?, ?) ON CONFLICT (name) DO NOTHING", UUID.randomUUID(), "ADMIN");

        // Grant all permissions to ADMIN (idempotent)
        var adminRoleId = jdbc.queryForObject("select id from roles where name = 'ADMIN'", java.util.UUID.class);
        var permIds = jdbc.queryForList("select id from permissions", java.util.UUID.class);
        for (var pid : permIds){
            jdbc.update("INSERT INTO roles_permissions(role_id, permission_id) VALUES (?, ?) ON CONFLICT DO NOTHING", adminRoleId, pid);
        }
    }

    private void ensureAdmin(){
        Optional<User> existing = users.findByUsername(adminUsername);
        if (existing.isEmpty()){
            // Create admin user with ADMIN role
            Role adminRole = roles.findByName("ADMIN").orElseGet(() -> {
                Role r = new Role(); r.setName("ADMIN"); return roles.save(r);
            });
            User u = new User();
            u.setUsername(adminUsername);
            u.setEmail("contact@admin.com");
            u.setPassword(encoder.encode(adminPassword));
            u.setEnabled(true);
            u.setRoles(Set.of(adminRole));
            users.save(u);
            log.info("[DEV] Created default admin user '{}'", adminUsername);
        } else {
            User u = existing.get();
            // Ensure has ADMIN role
            Role adminRole = roles.findByName("ADMIN").orElseGet(() -> {
                Role r = new Role(); r.setName("ADMIN"); return roles.save(r);
            });
            if (u.getRoles() == null || u.getRoles().stream().noneMatch(r -> "ADMIN".equalsIgnoreCase(r.getName()))){
                u.setRoles(java.util.stream.Stream.concat(u.getRoles()==null?java.util.stream.Stream.empty():u.getRoles().stream(), java.util.stream.Stream.of(adminRole)).collect(java.util.stream.Collectors.toSet()));
            }
            // Reset password to configured dev password if it doesn't match
            if (!encoder.matches(adminPassword, u.getPassword())){
                u.setPassword(encoder.encode(adminPassword));
                log.info("[DEV] Reset admin password hash to match configured dev password.");
            }
            users.save(u);
        }
    }
}
