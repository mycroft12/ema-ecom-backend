package com.mycroft.ema.ecom.auth.web;

import com.mycroft.ema.ecom.auth.domain.User;
import com.mycroft.ema.ecom.auth.dto.RoleIdsRequest;
import com.mycroft.ema.ecom.auth.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/users")
@Tag(name = "Users", description = "Manage application users")
public class UserController {

  private final UserService users;

  public UserController(UserService users){
    this.users = users;
  }

  @GetMapping
  @PreAuthorize("hasAuthority('user:read')")
  @Operation(summary = "List users")
  public List<User> findAll(){
    return users.findAll();
  }

  @GetMapping("/{id}")
  @PreAuthorize("hasAuthority('user:read')")
  @Operation(summary = "Get user by id")
  public User get(@PathVariable UUID id){
    return users.get(id);
  }

  @PostMapping
  @PreAuthorize("hasAuthority('user:create') or hasRole('ADMIN')")
  @Operation(summary = "Create user")
  public User create(@RequestBody User u){
    return users.create(u);
  }

  @PutMapping("/{id}")
  @PreAuthorize("hasAuthority('user:update') or hasRole('ADMIN')")
  @Operation(summary = "Update user")
  public User update(@PathVariable UUID id, @RequestBody User u){
    return users.update(id, u);
  }

  @DeleteMapping("/{id}")
  @PreAuthorize("hasAuthority('user:delete') or hasRole('ADMIN')")
  @Operation(summary = "Delete user")
  public void delete(@PathVariable UUID id){
    users.delete(id);
  }

  @PostMapping("/{id}/enable")
  @PreAuthorize("hasAuthority('user:update') or hasRole('ADMIN')")
  @Operation(summary = "Enable user")
  public User enable(@PathVariable UUID id){
    return users.enable(id);
  }

  @PostMapping("/{id}/disable")
  @PreAuthorize("hasAuthority('user:update') or hasRole('ADMIN')")
  @Operation(summary = "Disable user")
  public User disable(@PathVariable UUID id){
    return users.disable(id);
  }

  @PostMapping("/{id}/roles/attach")
  @PreAuthorize("hasAuthority('user:update') or hasRole('ADMIN')")
  @Operation(summary = "Attach roles to user")
  public User attachRoles(@PathVariable UUID id, @RequestBody RoleIdsRequest req){
    return users.attachRoles(id, req.roleIds());
  }

  @PostMapping("/{id}/roles/detach")
  @PreAuthorize("hasAuthority('user:update') or hasRole('ADMIN')")
  @Operation(summary = "Detach roles from user")
  public User detachRoles(@PathVariable UUID id, @RequestBody RoleIdsRequest req){
    return users.detachRoles(id, req.roleIds());
  }
}
