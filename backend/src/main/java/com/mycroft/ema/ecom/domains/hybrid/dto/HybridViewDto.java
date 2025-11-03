package com.mycroft.ema.ecom.domains.hybrid.dto;

import java.util.Map;
import java.util.UUID;

/**
 * View model representing a hybrid entity row with its identifier and dynamic attributes.
 */
public record HybridViewDto(UUID id, Map<String, Object> attributes) {}
