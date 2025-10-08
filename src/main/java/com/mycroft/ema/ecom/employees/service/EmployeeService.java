package com.mycroft.ema.ecom.employees.service;

import com.mycroft.ema.ecom.employees.domain.EmployeeType;
import com.mycroft.ema.ecom.employees.dto.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface EmployeeService {
  Page<EmployeeViewDto> search(String q, EmployeeType type, Pageable pageable);
  EmployeeViewDto create(EmployeeCreateDto dto);
  EmployeeViewDto update(UUID id, EmployeeUpdateDto dto);
  void delete(UUID id);
  EmployeeViewDto get(UUID id);
}
