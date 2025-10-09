package com.mycroft.ema.ecom.employees.dto;

import com.mycroft.ema.ecom.employees.domain.EmployeeType;
import java.util.UUID;

public record EmployeeViewDto(
        UUID id,
        String firstName,
        String lastName,
        EmployeeType type,
        String companyName,
        String phone,
        String email
) {}
