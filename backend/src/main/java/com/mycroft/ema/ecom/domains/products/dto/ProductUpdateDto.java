package com.mycroft.ema.ecom.domains.products.dto;

import java.util.Map;

public record ProductUpdateDto(
        Map<String, Object> attributes
) {}
