package com.mycroft.ema.ecom.domains.hybrid.dto;

import jakarta.validation.constraints.NotNull;

import java.util.Map;

/**
 * Request payload for updating a hybrid entity instance with new attribute values.
 */
public record HybridUpdateDto(@NotNull Map<String, Object> attributes) {}
