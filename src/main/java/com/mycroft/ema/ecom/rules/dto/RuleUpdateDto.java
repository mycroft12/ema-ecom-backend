package com.mycroft.ema.ecom.rules.dto;

import com.mycroft.ema.ecom.rules.domain.RuleType;
import jakarta.validation.constraints.*;

public record RuleUpdateDto(
    @NotBlank String name,
    @NotNull RuleType type,
    @NotBlank String expression,
    Boolean active
) {}
