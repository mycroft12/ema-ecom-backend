package com.mycroft.ema.ecom.domains.rules.dto;

import com.mycroft.ema.ecom.domains.rules.domain.RuleType;
import jakarta.validation.constraints.*;

public record RuleUpdateDto(
    @NotBlank String name,
    @NotNull RuleType type,
    @NotBlank String expression,
    Boolean active
) {}
