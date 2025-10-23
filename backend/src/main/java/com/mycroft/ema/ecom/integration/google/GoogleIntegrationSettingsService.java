package com.mycroft.ema.ecom.integration.google;

import com.mycroft.ema.ecom.integration.google.dto.GoogleIntegrationConfigResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
public class GoogleIntegrationSettingsService {

  private final GoogleIntegrationSettingsRepository repository;

  public GoogleIntegrationSettingsService(GoogleIntegrationSettingsRepository repository) {
    this.repository = repository;
  }

  @Transactional(readOnly = true)
  public GoogleIntegrationConfigResponse currentConfig() {
    GoogleIntegrationSettings settings = repository.findById(GoogleIntegrationSettings.SINGLETON_ID)
        .orElse(null);
    if (settings == null) {
      return GoogleIntegrationConfigResponse.of(null, null);
    }
    return GoogleIntegrationConfigResponse.of(settings.getClientId(), settings.getApiKey());
  }

  @Transactional
  public GoogleIntegrationConfigResponse update(String clientId, String apiKey, String updatedBy) {
    GoogleIntegrationSettings settings = repository.findById(GoogleIntegrationSettings.SINGLETON_ID)
        .orElseGet(GoogleIntegrationSettings::new);
    settings.setClientId(trimOrNull(clientId));
    settings.setApiKey(trimOrNull(apiKey));
    settings.setUpdatedBy(updatedBy);
    GoogleIntegrationSettings saved = repository.save(settings);
    return GoogleIntegrationConfigResponse.of(saved.getClientId(), saved.getApiKey());
  }

  private String trimOrNull(String value) {
    if (value == null) {
      return null;
    }
    String trimmed = value.trim();
    return trimmed.isEmpty() ? null : trimmed;
  }
}
