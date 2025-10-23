package com.mycroft.ema.ecom.integration.google.dto;

public record GoogleIntegrationConfigResponse(
    String clientId,
    String apiKey,
    boolean configured
) {
  public static GoogleIntegrationConfigResponse of(String clientId, String apiKey) {
    boolean configured = clientId != null && !clientId.isBlank()
        && apiKey != null && !apiKey.isBlank();
    return new GoogleIntegrationConfigResponse(clientId, apiKey, configured);
  }
}
