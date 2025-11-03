package com.mycroft.ema.ecom.domains.imports.dto;

import java.util.Map;

/**
 * Request body representing a single row change pushed from Google Sheets for synchronization.
 */
public record GoogleSheetSyncRequest(
    String domain,
    String spreadsheetId,
    String tabName,
    Long rowNumber,
    String action,
    Map<String, Object> row
) {}
