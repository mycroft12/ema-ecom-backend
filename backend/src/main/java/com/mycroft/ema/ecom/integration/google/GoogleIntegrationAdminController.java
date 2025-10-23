package com.mycroft.ema.ecom.integration.google;

import com.mycroft.ema.ecom.integration.google.dto.GoogleIntegrationConfigResponse;
import com.mycroft.ema.ecom.integration.google.dto.UpdateGoogleIntegrationRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/google-integration")
@Tag(name = "Google Integration Admin", description = "Manage Google Drive picker settings")
public class GoogleIntegrationAdminController {

  private final GoogleIntegrationSettingsService settingsService;

  public GoogleIntegrationAdminController(GoogleIntegrationSettingsService settingsService) {
    this.settingsService = settingsService;
  }

  @GetMapping
  @PreAuthorize("hasAuthority('google-sheet:access')")
  @Operation(summary = "Get Google Drive picker settings")
  public GoogleIntegrationConfigResponse getConfig() {
    return settingsService.currentConfig();
  }

  @PutMapping
  @PreAuthorize("hasAuthority('google-sheet:access')")
  @Operation(summary = "Update Google Drive picker settings")
  public GoogleIntegrationConfigResponse update(
      @Valid @RequestBody UpdateGoogleIntegrationRequest request,
      Authentication authentication
  ) {
    String updatedBy = authentication != null ? authentication.getName() : null;
    return settingsService.update(request.clientId(), request.apiKey(), updatedBy);
  }
}
