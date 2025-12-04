package com.mycroft.ema.ecom.domains.imports.repo;

import com.mycroft.ema.ecom.domains.imports.domain.GoogleImportConfig;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for managing {@link GoogleImportConfig} entries keyed by domain or sheet identifiers.
 */
public interface GoogleImportConfigRepository extends JpaRepository<GoogleImportConfig, UUID> {
  List<GoogleImportConfig> findAllByDomain(String domain);
  Optional<GoogleImportConfig> findBySpreadsheetIdAndTabName(String spreadsheetId, String tabName);
}
