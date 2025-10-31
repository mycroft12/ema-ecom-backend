package com.mycroft.ema.ecom.domains.hybrid.web;

import com.mycroft.ema.ecom.domains.hybrid.dto.HybridCreateDto;
import com.mycroft.ema.ecom.domains.hybrid.dto.HybridResponseDto;
import com.mycroft.ema.ecom.domains.hybrid.dto.HybridUpdateDto;
import com.mycroft.ema.ecom.domains.hybrid.dto.HybridViewDto;
import com.mycroft.ema.ecom.domains.hybrid.service.HybridEntityService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/hybrid/{entityType}")
@Tag(name = "Hybrid Entities", description = "Dynamic entity management endpoint")
public class HybridEntityController {

  private final HybridEntityService service;

  public HybridEntityController(HybridEntityService service) {
    this.service = service;
  }

  @GetMapping
  @PreAuthorize("hasAuthority(#entityType + ':read')")
  @Operation(summary = "Search dynamic entities",
      description = "Search any configured entity type with pagination. includeSchema=true returns dynamic columns metadata.")
  public HybridResponseDto.SearchResponse search(@PathVariable String entityType,
                                                 @RequestParam(required = false) String q,
                                                 @RequestParam(defaultValue = "false") boolean includeSchema,
                                                 Pageable pageable,
                                                 @RequestParam MultiValueMap<String, String> requestParams) {
    MultiValueMap<String, String> filterParams = new LinkedMultiValueMap<>();
    requestParams.forEach((key, values) -> {
      if (key != null && key.startsWith("filter.")) {
        filterParams.put(key, values);
      }
    });
    var page = service.search(entityType, q, filterParams, pageable);
    List<HybridResponseDto.ColumnDto> columns = includeSchema ? service.listColumns(entityType) : null;
    return HybridResponseDto.SearchResponse.of(page, columns);
  }

  @GetMapping("/{id}")
  @PreAuthorize("hasAuthority(#entityType + ':read')")
  @Operation(summary = "Get dynamic entity by id")
  public HybridViewDto get(@PathVariable String entityType, @PathVariable UUID id) {
    return service.get(entityType, id);
  }

  @PostMapping
  @PreAuthorize("hasAuthority(#entityType + ':create')")
  @Operation(summary = "Create dynamic entity")
  public HybridViewDto create(@PathVariable String entityType, @Valid @RequestBody HybridCreateDto dto) {
    return service.create(entityType, dto);
  }

  @PutMapping("/{id}")
  @PreAuthorize("hasAuthority(#entityType + ':update')")
  @Operation(summary = "Update dynamic entity")
  public HybridViewDto update(@PathVariable String entityType,
                              @PathVariable UUID id,
                              @Valid @RequestBody HybridUpdateDto dto) {
    return service.update(entityType, id, dto);
  }

  @DeleteMapping("/{id}")
  @PreAuthorize("hasAuthority(#entityType + ':delete')")
  @Operation(summary = "Delete dynamic entity")
  public void delete(@PathVariable String entityType, @PathVariable UUID id) {
    service.delete(entityType, id);
  }
}
