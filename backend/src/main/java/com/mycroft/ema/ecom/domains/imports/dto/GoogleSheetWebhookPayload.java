package com.mycroft.ema.ecom.domains.imports.dto;

import java.util.List;

/**
 * Payload sent from Google Apps Script webhooks when a sheet change needs to be synchronized.
 */
public record GoogleSheetWebhookPayload(
    String spreadsheetId,
    String tabName,
    String domain,
    long rowIndex,
    List<String> header,
    List<String> values
) {
}
