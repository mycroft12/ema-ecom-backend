package com.mycroft.ema.ecom.domains.dashboard.dto;

import java.util.UUID;

public record UserLookupDto(UUID id, String username, String email) {}
