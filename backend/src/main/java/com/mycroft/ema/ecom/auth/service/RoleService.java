package com.mycroft.ema.ecom.auth.service;

import com.mycroft.ema.ecom.auth.domain.Role;

import java.util.List;
import java.util.UUID;

public interface RoleService {
  List<Role> findAll();
  Role create(Role r);
  Role update(UUID id, Role r);
  void delete(UUID id, boolean force);
}
