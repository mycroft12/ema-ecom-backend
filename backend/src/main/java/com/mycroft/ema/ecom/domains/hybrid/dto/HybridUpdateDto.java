package com.mycroft.ema.ecom.domains.hybrid.dto;

import jakarta.validation.constraints.NotNull;

import java.util.Map;

public record HybridUpdateDto(@NotNull Map<String, Object> attributes) {}
