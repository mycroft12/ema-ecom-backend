package com.mycroft.ema.ecom.domains.imports.service;

import java.time.Instant;

public record ProductUpsertEvent(String domain, java.util.UUID rowId, Instant timestamp) {}
