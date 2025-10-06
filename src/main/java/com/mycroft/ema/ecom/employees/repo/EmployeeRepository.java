package com.mycroft.ema.ecom.employees.repo;

import com.mycroft.ema.ecom.employees.domain.Employee;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.jpa.domain.Specification;
import java.util.UUID;

public interface EmployeeRepository extends JpaRepository<Employee, UUID>, JpaSpecificationExecutor<Employee> {

  static Specification<Employee> firstNameLike(String q){
    return (root, cq, cb)
            -> q==null?null:cb.like(cb.lower(root.get("firstName")), "%"+q.toLowerCase()+"%");
  }

  static Specification<Employee> lastNameLike(String q){
    return (root, cq, cb)
            -> q==null?null:cb.like(cb.lower(root.get("lastName")), "%"+q.toLowerCase()+"%");
  }

  static Specification<Employee> typeEq(com.mycroft.ema.ecom.employees.domain.EmployeeType type){
    return (root, cq, cb)
            -> type==null?null:cb.equal(root.get("type"), type);
  }

}
