package com.mycroft.ema.ecom.domains.imports.domain;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "google_import_config",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_google_import_domain", columnNames = {"domain"}),
        @UniqueConstraint(name = "uk_google_import_sheet", columnNames = {"spreadsheet_id", "tab_name"})
    })
public class GoogleImportConfig {

  @Id
  @GeneratedValue(strategy = GenerationType.AUTO)
  private UUID id;

  @Column(nullable = false, length = 50)
  private String domain;

  @Column(name = "spreadsheet_id", nullable = false, length = 128)
  private String spreadsheetId;

  @Column(name = "tab_name", length = 128)
  private String tabName;

  @Column(name = "header_hash", nullable = false, length = 128)
  private String headerHash;

  @Column(name = "last_row_imported")
  private long lastRowImported;

  @Column(nullable = false, length = 32)
  private String source;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  protected GoogleImportConfig() {
  }

  public GoogleImportConfig(String domain, String spreadsheetId, String tabName,
                             String headerHash, long lastRowImported, String source) {
    this.domain = domain;
    this.spreadsheetId = spreadsheetId;
    this.tabName = tabName;
    this.headerHash = headerHash;
    this.lastRowImported = lastRowImported;
    this.source = source;
  }

  @PrePersist
  public void onCreate() {
    Instant now = Instant.now();
    this.createdAt = now;
    this.updatedAt = now;
  }

  @PreUpdate
  public void onUpdate() {
    this.updatedAt = Instant.now();
  }

  public UUID getId() {
    return id;
  }

  public String getDomain() {
    return domain;
  }

  public void setDomain(String domain) {
    this.domain = domain;
  }

  public String getSpreadsheetId() {
    return spreadsheetId;
  }

  public void setSpreadsheetId(String spreadsheetId) {
    this.spreadsheetId = spreadsheetId;
  }

  public String getTabName() {
    return tabName;
  }

  public void setTabName(String tabName) {
    this.tabName = tabName;
  }

  public String getHeaderHash() {
    return headerHash;
  }

  public void setHeaderHash(String headerHash) {
    this.headerHash = headerHash;
  }

  public long getLastRowImported() {
    return lastRowImported;
  }

  public void setLastRowImported(long lastRowImported) {
    this.lastRowImported = lastRowImported;
  }

  public String getSource() {
    return source;
  }

  public void setSource(String source) {
    this.source = source;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public Instant getUpdatedAt() {
    return updatedAt;
  }

  @Override
  public boolean equals(Object o) {
    if (this == o) return true;
    if (!(o instanceof GoogleImportConfig that)) return false;
    return Objects.equals(id, that.id);
  }

  @Override
  public int hashCode() {
    return Objects.hashCode(id);
  }
}
