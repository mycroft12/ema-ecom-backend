package com.mycroft.ema.ecom.auth.service;

import com.mycroft.ema.ecom.auth.domain.Permission;

import java.util.List;
import java.util.UUID;

public interface PermissionService {
  List<Permission> findAll();
  Permission create(Permission p);
  Permission update(UUID id, Permission p);
  void delete(UUID id, boolean force);
  Permission ensure(String name);
}
