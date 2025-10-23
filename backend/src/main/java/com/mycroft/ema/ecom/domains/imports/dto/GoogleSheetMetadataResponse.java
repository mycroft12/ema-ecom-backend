package com.mycroft.ema.ecom.domains.imports.dto;

public record GoogleSheetMetadataResponse(
    Integer sheetId,
    String title,
    Integer index
) {
}
