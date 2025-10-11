package com.mycroft.ema.ecom.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Forgot password request payload")
public record ForgotPasswordRequest(
        @Schema(description = "Username or email to identify the user", example = "jane.doe")
        String identifier
) {}
