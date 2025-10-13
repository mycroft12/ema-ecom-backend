package com.mycroft.ema.ecom.domains.employees.repo;

import com.mycroft.ema.ecom.domains.employees.domain.Employee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.UUID;

/**
 * Simplified repository for dynamic Employee entity. No static field-based Specifications remain
 * because columns are defined dynamically via import configuration.
 */
public interface EmployeeRepository extends JpaRepository<Employee, UUID>, JpaSpecificationExecutor<Employee> {}
