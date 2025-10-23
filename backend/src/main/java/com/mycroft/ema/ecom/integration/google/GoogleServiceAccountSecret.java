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
@Table(name = "google_service_account_secret")
public class GoogleServiceAccountSecret {

  public static final UUID SINGLETON_ID = UUID.fromString("00000000-0000-0000-0000-000000000777");

  @Id
  private UUID id = SINGLETON_ID;

  @Column(name = "payload", nullable = false, columnDefinition = "bytea")
  private byte[] payload;

  @Column(name = "iv", nullable = false, columnDefinition = "bytea")
  private byte[] iv;

  @Column(name = "uploaded_by", length = 150)
  private String uploadedBy;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  public UUID getId() {
    return id;
  }

  public byte[] getPayload() {
    return payload;
  }

  public void setPayload(byte[] payload) {
    this.payload = payload;
  }

  public byte[] getIv() {
    return iv;
  }

  public void setIv(byte[] iv) {
    this.iv = iv;
  }

  public String getUploadedBy() {
    return uploadedBy;
  }

  public void setUploadedBy(String uploadedBy) {
    this.uploadedBy = uploadedBy;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public Instant getUpdatedAt() {
    return updatedAt;
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
}
