package com.mycroft.ema.ecom.employees.web;

import com.mycroft.ema.ecom.common.web.PageResponse; import com.mycroft.ema.ecom.employees.domain.EmployeeType; import com.mycroft.ema.ecom.employees.dto.*; import com.mycroft.ema.ecom.employees.service.EmployeeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid; import org.springframework.data.domain.Pageable; import org.springframework.security.access.prepost.PreAuthorize; import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController
@RequestMapping("/api/employees")
@Tag(name = "Employees", description = "Manage delivery company/individual employees")
public class EmployeeController {

  private final EmployeeService service;

  public EmployeeController(EmployeeService service){
    this.service=service;
  }

  @GetMapping
  @PreAuthorize("hasAuthority('employee:read')")
  @Operation(summary = "Search employees", description = "Search by name and type with pagination")
  public PageResponse<EmployeeViewDto> search(@RequestParam(required=false) String q,
                                              @RequestParam(required=false) EmployeeType type,
                                              Pageable pageable) {
    return PageResponse.of(service.search(q, type, pageable));
  }

  @GetMapping("/{id}")
  @PreAuthorize("hasAuthority('employee:read')")
  @Operation(summary = "Get employee")
  public EmployeeViewDto get(@PathVariable UUID id){
    return service.get(id);
  }

  @PostMapping
  @PreAuthorize("hasAuthority('employee:create')")
  @Operation(summary = "Create employee")
  public EmployeeViewDto create(@Valid @RequestBody EmployeeCreateDto dto){
    return service.create(dto);
  }

  @PutMapping("/{id}")
  @PreAuthorize("hasAuthority('employee:update')")
  @Operation(summary = "Update employee")
  public EmployeeViewDto update(@PathVariable UUID id, @Valid @RequestBody EmployeeUpdateDto dto){
    return service.update(id, dto);
  }

  @DeleteMapping("/{id}")
  @PreAuthorize("hasAuthority('employee:delete')")
  @Operation(summary = "Delete employee")
  public void delete(@PathVariable UUID id){
    service.delete(id);
  }

}
