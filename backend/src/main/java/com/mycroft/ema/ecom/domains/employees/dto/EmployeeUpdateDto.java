package com.mycroft.ema.ecom.domains.employees.dto;

import java.util.Map;

public record EmployeeUpdateDto(
        Map<String, Object> attributes
) {}
