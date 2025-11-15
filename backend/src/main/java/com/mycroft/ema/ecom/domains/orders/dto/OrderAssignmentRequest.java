package com.mycroft.ema.ecom.domains.orders.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record OrderAssignmentRequest(@NotNull UUID agentId) {}
