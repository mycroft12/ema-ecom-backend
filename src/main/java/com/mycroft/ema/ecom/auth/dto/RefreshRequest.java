package com.mycroft.ema.ecom.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Refresh token request payload")
public record RefreshRequest(
        @Schema(description = "Refresh token string", example = "<uuid-or-random>")
        String refreshToken
) {}
