package com.mycroft.ema.ecom.integration.google;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface GoogleIntegrationSettingsRepository extends JpaRepository<GoogleIntegrationSettings, UUID> {
}
