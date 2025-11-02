package com.mycroft.ema.ecom.integration.google.repository;

import com.mycroft.ema.ecom.integration.google.domain.GoogleServiceAccountSecret;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface GoogleServiceAccountSecretRepository extends JpaRepository<GoogleServiceAccountSecret, UUID> {
}
