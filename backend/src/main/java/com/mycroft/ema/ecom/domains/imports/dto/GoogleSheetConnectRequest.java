package com.mycroft.ema.ecom.domains.imports.dto;

import jakarta.validation.constraints.NotBlank;

public record GoogleSheetConnectRequest(
    @NotBlank String domain,
    String spreadsheetId,
    String sheetUrl,
    @NotBlank String tabName
) {
}
