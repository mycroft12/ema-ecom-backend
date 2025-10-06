package com.mycroft.ema.ecom.products.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;

public record ProductUpdateDto(
        @NotBlank
        String name,
        @DecimalMin(value="0.0", inclusive=false)
        BigDecimal price,
        String description,
        String photoUrl,
        Boolean active
) {}
