package com.mycroft.ema.ecom.rules.web;

import com.mycroft.ema.ecom.common.web.PageResponse;
import com.mycroft.ema.ecom.rules.dto.*;
import com.mycroft.ema.ecom.rules.service.RuleService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/rules")
public class RuleController {

  private final RuleService service;

  public RuleController(RuleService service){
    this.service=service;
  }

  @GetMapping
  @PreAuthorize("hasAuthority('rule:read')")
  public PageResponse<RuleViewDto> search(@RequestParam(required=false) String q,
                                          @RequestParam(required=false) Boolean active, Pageable pageable){
    return PageResponse.of(service.search(q, active, pageable));
  }

  @GetMapping("/{id}")
  @PreAuthorize("hasAuthority('rule:read')")
  public RuleViewDto get(@PathVariable UUID id){
    return service.get(id);
  }

  @PostMapping
  @PreAuthorize("hasAuthority('rule:create')")
  public RuleViewDto create(@Valid @RequestBody RuleCreateDto dto){
    return service.create(dto);
  }

  @PutMapping("/{id}")
  @PreAuthorize("hasAuthority('rule:update')")
  public RuleViewDto update(@PathVariable UUID id, @Valid @RequestBody RuleUpdateDto dto){
    return service.update(id, dto);
  }

  @DeleteMapping("/{id}")
  @PreAuthorize("hasAuthority('rule:delete')")
  public void delete(@PathVariable UUID id){
    service.delete(id);
  }

  @PostMapping("/{id}/evaluate")
  @PreAuthorize("hasAuthority('rule:evaluate')")
  public Map<String,Object> evaluate(@PathVariable UUID id, @RequestBody Map<String,Object> facts){
    return Map.of("status","not-implemented");
  }

}
