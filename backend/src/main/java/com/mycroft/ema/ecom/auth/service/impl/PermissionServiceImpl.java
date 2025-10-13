package com.mycroft.ema.ecom.auth.service.impl;

import com.mycroft.ema.ecom.auth.domain.Permission;
import com.mycroft.ema.ecom.auth.repo.PermissionRepository;
import com.mycroft.ema.ecom.auth.service.PermissionService;
import com.mycroft.ema.ecom.common.error.NotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class PermissionServiceImpl implements PermissionService {
  private final PermissionRepository perms;
  public PermissionServiceImpl(PermissionRepository perms){ this.perms=perms; }

  @Override
  public List<Permission> findAll(){ return perms.findAll(); }

  @Override
  public Permission create(Permission p){ return perms.save(p); }

  @Override
  public Permission update(UUID id, Permission p){
    var existing = perms.findById(id).orElseThrow(() -> new NotFoundException("Permission not found"));
    existing.setName(p.getName());
    return perms.save(existing);
  }

  @Override
  public void delete(UUID id){ perms.deleteById(id); }
}
