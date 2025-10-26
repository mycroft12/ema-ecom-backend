package com.mycroft.ema.ecom.domains.notifications.dto;

import java.time.Instant;
import java.util.UUID;

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
