package com.mycroft.ema.ecom.domains.employees.dto;

import com.mycroft.ema.ecom.domains.employees.domain.Employee;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

import java.util.Map;

@Primary
@Component
public class EmployeeMapper {

  public Employee toEntity(EmployeeCreateDto dto){
    // No static columns to set; return a new Employee with only BaseEntity fields.
    return new Employee();
  }

  public void updateEntity(EmployeeUpdateDto dto, Employee entity){
    // No-op: dynamic fields are not represented on the entity.
  }

  public EmployeeViewDto toView(Employee e){
    // Expose id and an empty attributes map until dynamic reading is implemented.
    return new EmployeeViewDto(e.getId(), Map.of());
  }
}
