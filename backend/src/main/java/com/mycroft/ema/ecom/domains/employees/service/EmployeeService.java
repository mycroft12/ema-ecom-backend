package com.mycroft.ema.ecom.domains.employees.service;

import com.mycroft.ema.ecom.domains.employees.dto.EmployeeCreateDto;
import com.mycroft.ema.ecom.domains.employees.dto.EmployeeUpdateDto;
import com.mycroft.ema.ecom.domains.employees.dto.EmployeeViewDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface EmployeeService {
  Page<EmployeeViewDto> search(String q, Pageable pageable);
  EmployeeViewDto create(EmployeeCreateDto dto);
  EmployeeViewDto update(UUID id, EmployeeUpdateDto dto);
  void delete(UUID id);
  EmployeeViewDto get(UUID id);
}
