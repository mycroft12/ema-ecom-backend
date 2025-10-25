package com.mycroft.ema.ecom.domains.imports.dto;

import java.util.Map;

public record GoogleSheetSyncRequest(
    String domain,
    String spreadsheetId,
    String tabName,
    Long rowNumber,
    String action,
    Map<String, Object> row
) {}
