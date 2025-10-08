package com.mycroft.ema.ecom.auth.web;

import com.mycroft.ema.ecom.auth.domain.Role;
import com.mycroft.ema.ecom.auth.service.RoleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.access.prepost.PreAuthorize; import org.springframework.web.bind.annotation.*;
import java.util.List; import java.util.UUID;

@RestController
@RequestMapping("/api/roles")
@Tag(name = "Roles", description = "Manage roles and their permissions")
public class RoleController {

  private final RoleService roles;

  public RoleController(RoleService roles){
    this.roles=roles;
  }

  @GetMapping @PreAuthorize("hasAuthority('role:read')")
  @Operation(summary = "List roles")
  public List<Role> findAll(){ return roles.findAll(); }

  @PostMapping @PreAuthorize("hasAuthority('role:create')")
  @Operation(summary = "Create role")
  public Role create(@RequestBody Role r){ return roles.create(r); }

  @PutMapping("/{id}") @PreAuthorize("hasAuthority('role:update')")
  @Operation(summary = "Update role")
  public Role update(@PathVariable UUID id, @RequestBody Role r){
    return roles.update(id, r);
  }

  @DeleteMapping("/{id}") @PreAuthorize("hasAuthority('role:delete')")
  @Operation(summary = "Delete role")
  public void delete(@PathVariable UUID id){ roles.delete(id); }
}
