package com.mycroft.ema.ecom.domains.hybrid.dto;

import jakarta.validation.constraints.NotNull;

import java.util.Map;

/**
 * Request payload for creating a hybrid entity instance, carrying dynamic attribute values.
 */
public record HybridCreateDto(@NotNull Map<String, Object> attributes) {}
