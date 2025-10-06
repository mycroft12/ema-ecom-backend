package com.mycroft.ema.ecom.products.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record ProductViewDto(
        UUID id,
        String name,
        String description,
        BigDecimal price,
        String photoUrl,
        boolean active
) {}
