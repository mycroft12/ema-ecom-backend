package com.mycroft.ema.ecom.delivery.dto;

import com.mycroft.ema.ecom.delivery.domain.DeliveryType;
import io.swagger.v3.oas.annotations.media.Schema;

import java.util.UUID;

@Schema(description = "Delivery Provider DTO")
public record DeliveryProviderDto(
        @Schema(description = "ID") UUID id,
        @Schema(description = "Name", example = "UPS") String name,
        @Schema(description = "Type") DeliveryType type,
        @Schema(description = "Contact person") String contactName,
        @Schema(description = "Contact email") String contactEmail,
        @Schema(description = "Contact phone") String contactPhone,
        @Schema(description = "Active flag") boolean active
) {}
