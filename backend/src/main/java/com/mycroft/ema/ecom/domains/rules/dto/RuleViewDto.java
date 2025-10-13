package com.mycroft.ema.ecom.domains.rules.dto;

import com.mycroft.ema.ecom.domains.rules.domain.RuleType;
import java.util.UUID;

public record RuleViewDto(
    UUID id,
    String name,
    RuleType type,
    String expression,
    boolean active
) {}
