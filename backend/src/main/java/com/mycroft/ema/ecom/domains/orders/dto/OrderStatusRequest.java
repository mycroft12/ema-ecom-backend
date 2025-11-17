package com.mycroft.ema.ecom.domains.orders.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record OrderStatusRequest(
    @NotBlank String labelFr,
    @NotBlank String labelEn,
    @NotNull Integer displayOrder
) {}
