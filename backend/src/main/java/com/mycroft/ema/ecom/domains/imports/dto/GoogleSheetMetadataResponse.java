package com.mycroft.ema.ecom.domains.imports.dto;

/**
 * DTO exposing lightweight metadata about a sheet tab within a spreadsheet.
 */
public record GoogleSheetMetadataResponse(
    Integer sheetId,
    String title,
    Integer index
) {
}
