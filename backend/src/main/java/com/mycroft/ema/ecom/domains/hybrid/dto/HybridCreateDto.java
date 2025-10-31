package com.mycroft.ema.ecom.domains.hybrid.dto;

import jakarta.validation.constraints.NotNull;

import java.util.Map;

public record HybridCreateDto(@NotNull Map<String, Object> attributes) {}
