package com.mycroft.ema.ecom.auth.service;

import com.mycroft.ema.ecom.auth.domain.Role;

import java.util.List;
import java.util.UUID;

/**
 * Service abstraction for listing, creating and maintaining {@link com.mycroft.ema.ecom.auth.domain.Role} entities.
 */
public interface RoleService {
  List<Role> findAll();
  Role create(Role r);
  Role update(UUID id, Role r);
  void delete(UUID id, boolean force);
}
