package com.mycroft.ema.ecom.domains.notifications.dto;

import java.time.Instant;
import java.util.UUID;

/**
 * API response model for notification log entries returned to clients.
 */
public record NotificationLogDto(
    UUID id,
    String domain,
    String action,
    UUID rowId,
    Long rowNumber,
    java.util.List<String> changedColumns,
    Instant createdAt,
    boolean read
) {}
