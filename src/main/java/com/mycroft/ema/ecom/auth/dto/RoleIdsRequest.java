package com.mycroft.ema.ecom.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;
import java.util.UUID;

@Schema(description = "Attach/Detach roles payload")
public record RoleIdsRequest(
        @Schema(description = "List of role IDs to attach/detach")
        List<UUID> roleIds
) {}
