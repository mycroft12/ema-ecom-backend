package com.mycroft.ema.ecom.employees.dto;

import com.mycroft.ema.ecom.employees.domain.EmployeeType;
import jakarta.validation.constraints.*;

public record EmployeeCreateDto(
        @NotBlank String firstName,
        @NotBlank String lastName,
        @NotNull EmployeeType type,
        String companyName,
        @Pattern(regexp="^\\+?[0-9 .-]{6,}$", message="invalid phone") String phone,
        @Email String email
) {}
