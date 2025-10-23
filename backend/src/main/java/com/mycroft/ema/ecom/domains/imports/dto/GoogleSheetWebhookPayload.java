package com.mycroft.ema.ecom.domains.imports.dto;

import java.util.List;

public record GoogleSheetWebhookPayload(
    String spreadsheetId,
    String tabName,
    String domain,
    long rowIndex,
    List<String> header,
    List<String> values
) {
}
