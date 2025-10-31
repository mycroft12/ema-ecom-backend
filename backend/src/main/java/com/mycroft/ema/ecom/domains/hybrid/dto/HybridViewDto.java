package com.mycroft.ema.ecom.domains.hybrid.dto;

import java.util.Map;
import java.util.UUID;

public record HybridViewDto(UUID id, Map<String, Object> attributes) {}
