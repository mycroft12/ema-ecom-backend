package com.mycroft.ema.ecom.delivery.dto;

import com.mycroft.ema.ecom.delivery.domain.DeliveryType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

@Schema(description = "Create/Update Delivery Provider payload")
public record DeliveryProviderCreateUpdateDto(
        @NotBlank @Schema(example = "UPS") String name,
        @NotNull @Schema(example = "ENTERPRISE") DeliveryType type,
        @Schema(example = "Jane Smith") String contactName,
        @Email @Schema(example = "jane@ups.com") String contactEmail,
        @Schema(example = "+1-555-0101") String contactPhone,
        @Schema(example = "true") Boolean active
) {}
