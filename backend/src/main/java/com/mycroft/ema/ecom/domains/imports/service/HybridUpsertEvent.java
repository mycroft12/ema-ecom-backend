package com.mycroft.ema.ecom.domains.imports.service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Event payload emitted when a hybrid entity row is created, updated or deleted.
 */
public record HybridUpsertEvent(
    String domain,
    UUID rowId,
    Instant timestamp,
    String action,
    Long rowNumber,
    List<String> changedColumns,
    UUID notificationId
) {}
