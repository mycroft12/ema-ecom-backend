package com.mycroft.ema.ecom.products.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record ProductViewDto(
        UUID id,
        String title,
        String reference,
        String description,
        BigDecimal buyPrice,
        BigDecimal sellPrice,
        BigDecimal affiliateCommission
) {}
