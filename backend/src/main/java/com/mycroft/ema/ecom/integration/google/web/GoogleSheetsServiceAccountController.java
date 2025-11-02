package com.mycroft.ema.ecom.integration.google.web;

import com.mycroft.ema.ecom.integration.google.service.GoogleSheetsClient;
import com.mycroft.ema.ecom.integration.google.config.GoogleSheetsProperties;
import com.mycroft.ema.ecom.integration.google.dto.GoogleSheetTestRequest;
import com.mycroft.ema.ecom.integration.google.dto.GoogleSheetTestResponse;
import com.mycroft.ema.ecom.integration.google.service.GoogleServiceAccountCredentialService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/integrations/google/sheets")
@Tag(name = "Google Sheets Integration", description = "Manage Google Sheets service account and configuration")
public class GoogleSheetsServiceAccountController {

  private final GoogleServiceAccountCredentialService credentialService;
  private final GoogleSheetsClient sheetsClient;
  private final GoogleSheetsProperties properties;

  public GoogleSheetsServiceAccountController(GoogleServiceAccountCredentialService credentialService,
                                              GoogleSheetsClient sheetsClient,
                                              GoogleSheetsProperties properties) {
    this.credentialService = credentialService;
    this.sheetsClient = sheetsClient;
    this.properties = properties;
  }

  @PostMapping(value = "/service-account", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  @PreAuthorize("hasAuthority('google-sheet:access')")
  @Operation(summary = "Upload Google service account JSON")
  public GoogleServiceAccountCredentialService.ServiceAccountStatus uploadCredentials(
      @RequestPart("file") MultipartFile file,
      Authentication authentication
  ) {
    String uploadedBy = authentication != null ? authentication.getName() : "unknown";
    GoogleServiceAccountCredentialService.ServiceAccountStatus status = credentialService.upload(file, uploadedBy);
    sheetsClient.invalidateCache();
    return status;
  }

  @GetMapping("/service-account")
  @PreAuthorize("hasAuthority('google-sheet:access')")
  @Operation(summary = "Get current service account status")
  public GoogleServiceAccountCredentialService.ServiceAccountStatus status() {
    return credentialService.status();
  }

  @DeleteMapping("/service-account")
  @PreAuthorize("hasAuthority('google-sheet:access')")
  @Operation(summary = "Remove stored service account credentials")
  public void delete() {
    credentialService.delete();
    sheetsClient.invalidateCache();
  }

  @PostMapping("/test")
  @PreAuthorize("hasAuthority('import:configure')")
  @Operation(summary = "Test a spreadsheet connection using stored credentials")
  public GoogleSheetTestResponse testConnection(@Valid @RequestBody GoogleSheetTestRequest request) {
    String baseRange = properties.defaultReadRange();
    String range = request.tabName() == null || request.tabName().isBlank()
        ? baseRange
        : request.tabName() + "!" + baseRange;

    List<List<Object>> values = sheetsClient.readSheet(request.spreadsheetId(), range);
    return GoogleSheetTestResponse.fromValues(values);
  }
}
