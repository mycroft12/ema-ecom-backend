package com.mycroft.ema.ecom.integration.google.dto;

import jakarta.validation.constraints.NotBlank;

public record GoogleSheetTestRequest(
    @NotBlank String spreadsheetId,
    String tabName
) {
}
