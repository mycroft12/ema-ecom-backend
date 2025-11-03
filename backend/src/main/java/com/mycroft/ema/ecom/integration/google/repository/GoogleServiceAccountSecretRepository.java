package com.mycroft.ema.ecom.integration.google.repository;

import com.mycroft.ema.ecom.integration.google.domain.GoogleServiceAccountSecret;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * JPA repository for accessing the singleton {@link GoogleServiceAccountSecret} entity.
 */
public interface GoogleServiceAccountSecretRepository extends JpaRepository<GoogleServiceAccountSecret, UUID> {
}
