package com.mycroft.ema.ecom.domains.delivery.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.Map;
import java.util.UUID;

@Schema(description = "Delivery Provider DTO (dynamic)")
public record DeliveryProviderDto(
        @Schema(description = "ID") UUID id,
        @Schema(description = "Dynamic attributes map") Map<String, Object> attributes
) {}
