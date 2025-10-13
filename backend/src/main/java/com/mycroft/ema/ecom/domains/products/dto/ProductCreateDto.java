package com.mycroft.ema.ecom.domains.products.dto;

import java.util.Map;

public record ProductCreateDto(
        Map<String, Object> attributes
) {}
