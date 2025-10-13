package com.mycroft.ema.ecom.domains.delivery.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.Map;

@Schema(description = "Create/Update Delivery Provider payload (dynamic)")
public record DeliveryProviderCreateUpdateDto(
        Map<String, Object> attributes
) {}
