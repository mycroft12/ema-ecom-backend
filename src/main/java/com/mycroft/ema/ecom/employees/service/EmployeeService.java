package com.mycroft.ema.ecom.employees.service;

import com.mycroft.ema.ecom.common.error.NotFoundException;
import com.mycroft.ema.ecom.employees.domain.Employee;
import com.mycroft.ema.ecom.employees.domain.EmployeeType;
import com.mycroft.ema.ecom.employees.dto.*;
import com.mycroft.ema.ecom.employees.repo.EmployeeRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import java.util.UUID;
import static com.mycroft.ema.ecom.employees.repo.EmployeeRepository.*;

@Service
public class EmployeeService {

  private final EmployeeRepository repo;
  private final EmployeeMapper mapper;

  public EmployeeService(EmployeeRepository repo, EmployeeMapper mapper){
    this.repo=repo; this.mapper=mapper;
  }

  public Page<EmployeeViewDto> search(String q, EmployeeType type, Pageable pageable){
    Specification<Employee> spec = Specification.allOf(
        Specification.anyOf(firstNameLike(q), lastNameLike(q)),
        typeEq(type)
    );
    return repo.findAll(spec, pageable).map(mapper::toView);
  }

  public EmployeeViewDto create(EmployeeCreateDto dto){
    return mapper.toView(repo.save(mapper.toEntity(dto)));
  }

  public EmployeeViewDto update(UUID id, EmployeeUpdateDto dto){
    var e = repo.findById(id).orElseThrow(
            ()->new NotFoundException("Employee not found"));
    mapper.updateEntity(dto, e);
    return mapper.toView(repo.save(e));
  }

  public void delete(UUID id){
    repo.deleteById(id);
  }

  public EmployeeViewDto get(UUID id){
    return repo.findById(id).map(mapper::toView)
            .orElseThrow(()->new NotFoundException("Employee not found"));
  }

}
