package com.mycroft.ema.ecom.auth.service.impl;

import com.mycroft.ema.ecom.auth.domain.Role;
import com.mycroft.ema.ecom.auth.repo.RoleRepository;
import com.mycroft.ema.ecom.auth.service.RoleService;
import com.mycroft.ema.ecom.common.error.NotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class RoleServiceImpl implements RoleService {
  private final RoleRepository roles;

  public RoleServiceImpl(RoleRepository roles){ this.roles=roles; }

  @Override
  public List<Role> findAll(){ return roles.findAll(); }

  @Override
  public Role create(Role r){ return roles.save(r); }

  @Override
  public Role update(UUID id, Role r){
    var existing = roles.findById(id).orElseThrow(() -> new NotFoundException("Role not found"));
    existing.setName(r.getName());
    existing.setPermissions(r.getPermissions());
    return roles.save(existing);
  }

  @Override
  public void delete(UUID id){ roles.deleteById(id); }
}
