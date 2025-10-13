package com.mycroft.ema.ecom.domains.products.dto;

import java.util.Map;
import java.util.UUID;

public record ProductViewDto(
        UUID id,
        Map<String, Object> attributes
) {}
