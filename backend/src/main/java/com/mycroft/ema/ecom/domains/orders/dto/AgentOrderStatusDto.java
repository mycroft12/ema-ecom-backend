package com.mycroft.ema.ecom.domains.orders.dto;

/**
 * Lightweight summary of an agent's workload to drive UI guardrails.
 */
public record AgentOrderStatusDto(long activeOrders, boolean hasActiveOrders) {}
