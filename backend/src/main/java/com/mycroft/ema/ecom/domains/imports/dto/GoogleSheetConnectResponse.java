package com.mycroft.ema.ecom.domains.imports.dto;

public record GoogleSheetConnectResponse(boolean configured) {
  public static GoogleSheetConnectResponse configuredResponse() {
    return new GoogleSheetConnectResponse(true);
  }
}
