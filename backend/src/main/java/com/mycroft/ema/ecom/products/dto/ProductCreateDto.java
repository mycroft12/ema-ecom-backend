package com.mycroft.ema.ecom.products.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;

public record ProductCreateDto(
        @NotBlank String title,
        String reference,
        String description,
        @DecimalMin(value = "0.0", inclusive = true) BigDecimal buyPrice,
        @DecimalMin(value = "0.0", inclusive = true) BigDecimal sellPrice,
        @DecimalMin(value = "0.0", inclusive = true) BigDecimal affiliateCommission,
        byte[] picture
) {}
