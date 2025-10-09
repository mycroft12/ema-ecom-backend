package com.mycroft.ema.ecom.employees.dto;

import com.mycroft.ema.ecom.employees.domain.EmployeeType;
import jakarta.validation.constraints.*;

public record EmployeeUpdateDto(
        @NotBlank String firstName,
        @NotBlank String lastName,
        @NotNull EmployeeType type,
        String companyName,
        @Pattern(regexp="^\\+?[0-9 .-]{6,}$")
        String phone,
        @Email String email
) {}
