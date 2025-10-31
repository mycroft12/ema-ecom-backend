package com.mycroft.ema.ecom.domains.imports.service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record HybridUpsertEvent(
    String domain,
    UUID rowId,
    Instant timestamp,
    String action,
    Long rowNumber,
    List<String> changedColumns,
    UUID notificationId
) {}
