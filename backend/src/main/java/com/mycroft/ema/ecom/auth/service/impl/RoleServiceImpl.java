package com.mycroft.ema.ecom.auth.service.impl;

import com.mycroft.ema.ecom.auth.domain.Role;
import com.mycroft.ema.ecom.auth.domain.Permission;
import com.mycroft.ema.ecom.auth.repo.PermissionRepository;
import com.mycroft.ema.ecom.auth.repo.RoleRepository;
import com.mycroft.ema.ecom.auth.service.RoleService;
import com.mycroft.ema.ecom.common.error.NotFoundException;
import com.mycroft.ema.ecom.common.error.BadRequestException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class RoleServiceImpl implements RoleService {
  private final RoleRepository roles;
  private final PermissionRepository permissions;
  private final JdbcTemplate jdbc;

  public RoleServiceImpl(RoleRepository roles, PermissionRepository permissions, JdbcTemplate jdbc){
    this.roles = roles;
    this.permissions = permissions;
    this.jdbc = jdbc;
  }

  @Override
  public List<Role> findAll(){ return roles.findAll(); }

  @Override
  public Role create(Role r){ return roles.save(r); }

  @Override
  public Role update(UUID id, Role r){
    var existing = roles.findById(id).orElseThrow(() -> new NotFoundException("Role not found"));
    existing.setName(r.getName());
    if (r.getPermissions() != null) {
      var ids = r.getPermissions().stream()
          .map(Permission::getId)
          .filter(java.util.Objects::nonNull)
          .toList();
      var updated = new java.util.HashSet<>(permissions.findAllById(ids));
      existing.setPermissions(updated);
    }
    return roles.save(existing);
  }

  @Override
  public void delete(UUID id, boolean force){
    try {
      if (force) {
        jdbc.update("delete from users_roles where role_id = ?", id);
        jdbc.update("delete from roles_permissions where role_id = ?", id);
      }
      roles.deleteById(id);
    } catch (org.springframework.dao.DataIntegrityViolationException ex) {
      throw new BadRequestException("role.assigned", ex);
    }
  }
}
