package com.mycroft.ema.ecom.domains.imports.dto;

/**
 * Minimal response indicating whether a Google Sheet connection was established.
 */
public record GoogleSheetConnectResponse(boolean configured) {
  public static GoogleSheetConnectResponse configuredResponse() {
    return new GoogleSheetConnectResponse(true);
  }
}
