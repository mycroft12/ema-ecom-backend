package com.mycroft.ema.ecom.auth.web;

import com.mycroft.ema.ecom.auth.domain.Permission; import com.mycroft.ema.ecom.auth.repo.PermissionRepository;
import com.mycroft.ema.ecom.common.error.NotFoundException;
import org.springframework.security.access.prepost.PreAuthorize; import org.springframework.web.bind.annotation.*;
import java.util.List; import java.util.UUID;

@RestController @RequestMapping("/api/permissions")
public class PermissionController {

  private final PermissionRepository perms;

  public PermissionController(PermissionRepository perms){
    this.perms=perms;
  }

  @GetMapping
  @PreAuthorize("hasAuthority('permission:read')")
  public List<Permission> findAll(){
    return perms.findAll();
  }

  @PostMapping
  @PreAuthorize("hasAuthority('permission:create')")
  public Permission create(@RequestBody Permission p){
    return perms.save(p);
  }

  @PutMapping("/{id}")
  @PreAuthorize("hasAuthority('permission:update')")
  public Permission update(@PathVariable UUID id, @RequestBody Permission p){
    var existing = perms.findById(id).orElseThrow(() -> new NotFoundException("Permission not found"));
    existing.setName(p.getName());
    existing.setDescription(p.getDescription());
    return perms.save(existing);
  }

  @DeleteMapping("/{id}")
  @PreAuthorize("hasAuthority('permission:delete')")
  public void delete(@PathVariable UUID id){
    perms.deleteById(id);
  }
}
