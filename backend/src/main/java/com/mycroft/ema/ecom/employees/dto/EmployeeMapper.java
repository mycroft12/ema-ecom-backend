package com.mycroft.ema.ecom.employees.dto;

import com.mycroft.ema.ecom.employees.domain.Employee;
import org.mapstruct.*;

@Mapper(componentModel = "spring")
public interface EmployeeMapper {

  Employee toEntity(EmployeeCreateDto dto);
  @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
  void updateEntity(EmployeeUpdateDto dto, @MappingTarget Employee entity);
  EmployeeViewDto toView(Employee e);

}
