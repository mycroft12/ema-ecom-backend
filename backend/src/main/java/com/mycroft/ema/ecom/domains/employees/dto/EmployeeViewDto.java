package com.mycroft.ema.ecom.domains.employees.dto;

import java.util.Map;
import java.util.UUID;

public record EmployeeViewDto(
        UUID id,
        Map<String, Object> attributes
) {}
