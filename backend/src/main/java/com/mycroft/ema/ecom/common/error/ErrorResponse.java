package com.mycroft.ema.ecom.common.error;

/**
 * Canonical error payload serialized by the API, pairing an error code with a user-facing message.
 */
public record ErrorResponse(String code, String message) {}
