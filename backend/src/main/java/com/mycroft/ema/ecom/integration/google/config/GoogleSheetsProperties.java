package com.mycroft.ema.ecom.integration.google.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

@ConfigurationProperties(prefix = "google.sheets")
public record GoogleSheetsProperties(
    @DefaultValue("classpath:google/service-account.json") String credentialsPath,
    @DefaultValue("EMA E-Commerce Importer") String applicationName,
    @DefaultValue("A:ZZ") String defaultReadRange,
    String webhookSecret
) {
  public GoogleSheetsProperties {
    if (webhookSecret == null || webhookSecret.isBlank()) {
      throw new IllegalStateException("google.sheets.webhook-secret must be configured (use GOOGLE_SHEETS_WEBHOOK_SECRET)");
    }
  }
}
