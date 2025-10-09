package com.mycroft.ema.ecom.rules.web;

import com.mycroft.ema.ecom.common.web.PageResponse;
import com.mycroft.ema.ecom.rules.dto.*;
import com.mycroft.ema.ecom.rules.service.RuleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/rules")
@Tag(name = "Rules", description = "Manage business rules and evaluate them")
public class RuleController {

  private final RuleService service;

  public RuleController(RuleService service){
    this.service=service;
  }

  @GetMapping
  @PreAuthorize("hasAuthority('rule:read')")
  @Operation(summary = "Search rules", description = "Filter by name and active flag with pagination")
  public PageResponse<RuleViewDto> search(@RequestParam(required=false) String q,
                                          @RequestParam(required=false) Boolean active,
                                          Pageable pageable){
    return PageResponse.of(service.search(q, active, pageable));
  }

  @GetMapping("/{id}")
  @PreAuthorize("hasAuthority('rule:read')")
  @Operation(summary = "Get rule")
  public RuleViewDto get(@PathVariable UUID id){
    return service.get(id);
  }

  @PostMapping
  @PreAuthorize("hasAuthority('rule:create')")
  @Operation(summary = "Create rule")
  public RuleViewDto create(@Valid @RequestBody RuleCreateDto dto){
    return service.create(dto);
  }

  @PutMapping("/{id}")
  @PreAuthorize("hasAuthority('rule:update')")
  @Operation(summary = "Update rule")
  public RuleViewDto update(@PathVariable UUID id, @Valid @RequestBody RuleUpdateDto dto){
    return service.update(id, dto);
  }

  @DeleteMapping("/{id}")
  @PreAuthorize("hasAuthority('rule:delete')")
  @Operation(summary = "Delete rule")
  public void delete(@PathVariable UUID id){
    service.delete(id);
  }

  @PostMapping("/{id}/evaluate")
  @PreAuthorize("hasAuthority('rule:evaluate')")
  @Operation(summary = "Evaluate rule", description = "Evaluate a rule with provided facts and return the result")
  public Map<String,Object> evaluate(@PathVariable UUID id, @RequestBody Map<String,Object> facts){
    return Map.of("status","not-implemented");
  }

}
