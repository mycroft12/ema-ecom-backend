package com.mycroft.ema.ecom.domains.rules.dto;

import com.mycroft.ema.ecom.domains.rules.domain.RuleType;
import jakarta.validation.constraints.*;

public record RuleCreateDto(
    @NotBlank String name,
    @NotNull RuleType type,
    @NotBlank String expression,
    Boolean active
) {}
