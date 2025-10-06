package com.mycroft.ema.ecom.auth.web;

import com.mycroft.ema.ecom.auth.domain.Role; import com.mycroft.ema.ecom.auth.repo.RoleRepository;
import com.mycroft.ema.ecom.common.error.NotFoundException;
import org.springframework.security.access.prepost.PreAuthorize; import org.springframework.web.bind.annotation.*;
import java.util.List; import java.util.UUID;

@RestController @RequestMapping("/api/roles")
public class RoleController {

  private final RoleRepository roles;

  public RoleController(RoleRepository roles){
    this.roles=roles;
  }

  @GetMapping @PreAuthorize("hasAuthority('role:read')")
  public List<Role> findAll(){ return roles.findAll(); }

  @PostMapping @PreAuthorize("hasAuthority('role:create')")
  public Role create(@RequestBody Role r){ return roles.save(r); }

  @PutMapping("/{id}") @PreAuthorize("hasAuthority('role:update')")
  public Role update(@PathVariable UUID id, @RequestBody Role r){
    var existing = roles.findById(id).orElseThrow(() -> new NotFoundException("Role not found"));
    existing.setName(r.getName());
    existing.setPermissions(r.getPermissions());
    return roles.save(existing);
  }

  @DeleteMapping("/{id}") @PreAuthorize("hasAuthority('role:delete')")
  public void delete(@PathVariable UUID id){ roles.deleteById(id); }
}
