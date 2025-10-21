package com.mycroft.ema.ecom.auth.web;

import com.mycroft.ema.ecom.auth.domain.Permission;
import com.mycroft.ema.ecom.auth.service.PermissionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.access.prepost.PreAuthorize; import org.springframework.web.bind.annotation.*;
import java.util.List; import java.util.UUID;

@RestController
@RequestMapping("/api/permissions")
@Tag(name = "Permissions", description = "Manage granular permissions")
public class PermissionController {

  private final PermissionService perms;

  public PermissionController(PermissionService perms){
    this.perms=perms;
  }

  @GetMapping
  @PreAuthorize("hasAuthority('permission:read')")
  @Operation(summary = "List permissions")
  public List<Permission> findAll(){
    return perms.findAll();
  }

  @PostMapping
  @PreAuthorize("hasAuthority('permission:create')")
  @Operation(summary = "Create permission")
  public Permission create(@RequestBody Permission p){
    return perms.create(p);
  }

  @PutMapping("/{id}")
  @PreAuthorize("hasAuthority('permission:update')")
  @Operation(summary = "Update permission")
  public Permission update(@PathVariable UUID id, @RequestBody Permission p){
    return perms.update(id, p);
  }

  @DeleteMapping("/{id}")
  @PreAuthorize("hasAuthority('permission:delete')")
  @Operation(summary = "Delete permission")
  public void delete(@PathVariable UUID id, @RequestParam(value = "force", defaultValue = "false") boolean force){
    perms.delete(id, force);
  }
}
