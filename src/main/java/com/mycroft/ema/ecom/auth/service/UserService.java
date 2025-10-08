package com.mycroft.ema.ecom.auth.service;

import com.mycroft.ema.ecom.auth.domain.Role;
import com.mycroft.ema.ecom.auth.domain.User;

import java.util.List;
import java.util.Set;
import java.util.UUID;

public interface UserService {
  List<User> findAll();
  User get(UUID id);
  User create(User u);
  User update(UUID id, User u);
  void delete(UUID id);
  User enable(UUID id);
  User disable(UUID id);
  User attachRoles(UUID id, List<UUID> roleIds);
  User detachRoles(UUID id, List<UUID> roleIds);
}
