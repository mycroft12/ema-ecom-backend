package com.mycroft.ema.ecom.domains.orders.dto;

import java.util.UUID;

public record OrderStatusDto(UUID id, String name, Integer displayOrder, String labelEn, String labelFr) {}
