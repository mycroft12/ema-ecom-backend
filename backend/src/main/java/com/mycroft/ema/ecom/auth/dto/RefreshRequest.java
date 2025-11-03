package com.mycroft.ema.ecom.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Payload used to exchange a refresh token for a new access token or to revoke sessions.
 */
@Schema(description = "Refresh token request payload")
public record RefreshRequest(
        @Schema(description = "Refresh token string", example = "<uuid-or-random>")
        String refreshToken
) {}
