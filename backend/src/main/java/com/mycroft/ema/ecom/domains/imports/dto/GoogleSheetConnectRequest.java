package com.mycroft.ema.ecom.domains.imports.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Request payload for connecting a domain to a specific Google Sheet tab.
 */
public record GoogleSheetConnectRequest(
    @NotBlank String domain,
    String spreadsheetId,
    String sheetUrl,
    @NotBlank String tabName
) {
}
