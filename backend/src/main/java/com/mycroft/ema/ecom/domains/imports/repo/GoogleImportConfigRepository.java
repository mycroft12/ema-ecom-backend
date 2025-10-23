package com.mycroft.ema.ecom.domains.imports.repo;

import com.mycroft.ema.ecom.domains.imports.domain.GoogleImportConfig;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface GoogleImportConfigRepository extends JpaRepository<GoogleImportConfig, UUID> {
  Optional<GoogleImportConfig> findByDomain(String domain);
  Optional<GoogleImportConfig> findBySpreadsheetIdAndTabName(String spreadsheetId, String tabName);
}
