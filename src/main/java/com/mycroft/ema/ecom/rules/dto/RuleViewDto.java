package com.mycroft.ema.ecom.rules.dto;

import com.mycroft.ema.ecom.rules.domain.RuleType;
import java.util.UUID;

public record RuleViewDto(
    UUID id,
    String name,
    RuleType type,
    String expression,
    boolean active
) {}
