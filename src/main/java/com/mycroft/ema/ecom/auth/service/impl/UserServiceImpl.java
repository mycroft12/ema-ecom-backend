package com.mycroft.ema.ecom.auth.service.impl;

import com.mycroft.ema.ecom.auth.domain.Role;
import com.mycroft.ema.ecom.auth.domain.User;
import com.mycroft.ema.ecom.auth.repo.RoleRepository;
import com.mycroft.ema.ecom.auth.repo.UserRepository;
import com.mycroft.ema.ecom.auth.service.UserService;
import com.mycroft.ema.ecom.common.error.NotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class UserServiceImpl implements UserService {
  private final UserRepository users;
  private final RoleRepository roles;
  private final PasswordEncoder encoder;

  public UserServiceImpl(UserRepository users, RoleRepository roles, PasswordEncoder encoder){
    this.users=users; this.roles=roles; this.encoder=encoder;
  }

  @Override
  public List<User> findAll(){ return users.findAll(); }

  @Override
  public User get(UUID id){ return users.findById(id).orElseThrow(() -> new NotFoundException("User not found")); }

  @Override
  public User create(User u){
    if (u.getPassword() != null && !u.getPassword().isBlank()) {
      u.setPassword(encoder.encode(u.getPassword()));
    }
    return users.save(u);
  }

  @Override
  public User update(UUID id, User u){
    var existing = users.findById(id).orElseThrow(() -> new NotFoundException("User not found"));
    if (u.getUsername() != null) existing.setUsername(u.getUsername());
    if (u.getPassword() != null && !u.getPassword().isBlank()) {
      existing.setPassword(encoder.encode(u.getPassword()));
    }
    existing.setEnabled(u.isEnabled());
    if (u.getRoles() != null) existing.setRoles(u.getRoles());
    return users.save(existing);
  }

  @Override
  public void delete(UUID id){ users.deleteById(id); }

  @Override
  public User enable(UUID id){ var u = get(id); u.setEnabled(true); return users.save(u); }

  @Override
  public User disable(UUID id){ var u = get(id); u.setEnabled(false); return users.save(u); }

  @Override
  public User attachRoles(UUID id, List<UUID> roleIds){
    var user = get(id);
    Set<Role> current = new HashSet<>(Optional.ofNullable(user.getRoles()).orElseGet(Set::of));
    if (roleIds != null && !roleIds.isEmpty()) {
      var toAdd = roles.findAllById(roleIds);
      current.addAll(toAdd);
    }
    user.setRoles(current);
    return users.save(user);
  }

  @Override
  public User detachRoles(UUID id, List<UUID> roleIds){
    var user = get(id);
    Set<Role> current = new HashSet<>(Optional.ofNullable(user.getRoles()).orElseGet(Set::of));
    if (roleIds != null && !roleIds.isEmpty()) {
      var toRemove = new HashSet<Role>(roles.findAllById(roleIds));
      current.removeAll(toRemove);
    }
    user.setRoles(current);
    return users.save(user);
  }
}
