package com.mycroft.ema.ecom.integration.google.dto;

import jakarta.validation.constraints.NotBlank;

public record UpdateGoogleIntegrationRequest(
    @NotBlank String clientId,
    @NotBlank String apiKey
) {
}
