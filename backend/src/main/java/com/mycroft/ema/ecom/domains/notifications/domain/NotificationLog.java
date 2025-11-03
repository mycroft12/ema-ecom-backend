package com.mycroft.ema.ecom.domains.notifications.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

/**
 * Entity capturing audit notifications emitted for changes to dynamic domain rows.
 */
@Entity
@Table(name = "notification_logs")
public class NotificationLog {

  @Id
  private UUID id;

  @Column(nullable = false, length = 64)
  private String domain;

  @Column(nullable = false, length = 32)
  private String action;

  @Column(name = "row_id")
  private UUID rowId;

  @Column(name = "row_number")
  private Long rowNumber;

  @Column(name = "changed_columns", columnDefinition = "text")
  private String changedColumns;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "is_read", nullable = false)
  private boolean readFlag = false;

  public NotificationLog() {}

  public NotificationLog(UUID id, String domain, String action, UUID rowId, Long rowNumber, String changedColumns) {
    this.id = id;
    this.domain = domain;
    this.action = action;
    this.rowId = rowId;
    this.rowNumber = rowNumber;
    this.changedColumns = changedColumns;
  }

  @PrePersist
  public void onCreate() {
    if (this.id == null) {
      this.id = UUID.randomUUID();
    }
    this.createdAt = Instant.now();
  }

  public UUID getId() { return id; }
  public String getDomain() { return domain; }
  public String getAction() { return action; }
  public UUID getRowId() { return rowId; }
  public Long getRowNumber() { return rowNumber; }
  public String getChangedColumns() { return changedColumns; }
  public Instant getCreatedAt() { return createdAt; }
  public boolean isReadFlag() { return readFlag; }

  public void setDomain(String domain) { this.domain = domain; }
  public void setAction(String action) { this.action = action; }
  public void setRowId(UUID rowId) { this.rowId = rowId; }
  public void setRowNumber(Long rowNumber) { this.rowNumber = rowNumber; }
  public void setChangedColumns(String changedColumns) { this.changedColumns = changedColumns; }
  public void markRead() { this.readFlag = true; }
}
