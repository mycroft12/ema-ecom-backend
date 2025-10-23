package com.mycroft.ema.ecom.integration.google;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "google_integration_settings")
public class GoogleIntegrationSettings {

  public static final UUID SINGLETON_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");

  @Id
  private UUID id;

  @Column(name = "client_id", length = 255)
  private String clientId;

  @Column(name = "api_key", length = 255)
  private String apiKey;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  @Column(name = "updated_by", length = 150)
  private String updatedBy;

  protected GoogleIntegrationSettings() {
    this.id = SINGLETON_ID;
  }

  public GoogleIntegrationSettings(String clientId, String apiKey, String updatedBy) {
    this.id = SINGLETON_ID;
    this.clientId = clientId;
    this.apiKey = apiKey;
    this.updatedBy = updatedBy;
  }

  @PrePersist
  public void onCreate() {
    this.updatedAt = Instant.now();
  }

  @PreUpdate
  public void onUpdate() {
    this.updatedAt = Instant.now();
  }

  public UUID getId() {
    return id;
  }

  public String getClientId() {
    return clientId;
  }

  public void setClientId(String clientId) {
    this.clientId = clientId;
  }

  public String getApiKey() {
    return apiKey;
  }

  public void setApiKey(String apiKey) {
    this.apiKey = apiKey;
  }

  public Instant getUpdatedAt() {
    return updatedAt;
  }

  public String getUpdatedBy() {
    return updatedBy;
  }

  public void setUpdatedBy(String updatedBy) {
    this.updatedBy = updatedBy;
  }
}
