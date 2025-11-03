package com.mycroft.ema.ecom.integration.google.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Request payload used to validate connectivity to a specific Google Sheet and optional tab.
 */
public record GoogleSheetTestRequest(
    @NotBlank String spreadsheetId,
    String tabName
) {
}
