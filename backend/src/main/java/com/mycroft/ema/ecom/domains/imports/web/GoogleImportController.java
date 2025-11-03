package com.mycroft.ema.ecom.domains.imports.web;

import com.mycroft.ema.ecom.domains.imports.dto.GoogleSheetConnectRequest;
import com.mycroft.ema.ecom.domains.imports.dto.GoogleSheetConnectResponse;
import com.mycroft.ema.ecom.domains.imports.dto.GoogleSheetMetadataResponse;
import com.mycroft.ema.ecom.domains.imports.dto.GoogleSheetWebhookPayload;
import com.mycroft.ema.ecom.domains.imports.service.GoogleSheetImportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * REST endpoints for initiating Google Sheet-based imports and handling webhook callbacks.
 */
@RestController
@RequestMapping("/api/import/google")
@Tag(name = "Google Sheet Import", description = "Integrate Google Sheets with dynamic component configuration")
public class GoogleImportController {

  private static final Logger log = LoggerFactory.getLogger(GoogleImportController.class);

  private final GoogleSheetImportService importService;

  public GoogleImportController(GoogleSheetImportService importService) {
    this.importService = importService;
  }

  @PostMapping("/connect")
  @PreAuthorize("hasAuthority('import:configure')")
  @Operation(summary = "Connect a Google Sheet", description = "Reads the provided Google Sheet and configures the target domain using the existing CSV pipeline.")
  public GoogleSheetConnectResponse connect(@Valid @RequestBody GoogleSheetConnectRequest request) {
    importService.connectAndImport(request);
    return GoogleSheetConnectResponse.configuredResponse();
  }

  @GetMapping("/spreadsheets/{spreadsheetId}/sheets")
  @PreAuthorize("hasAuthority('import:configure')")
  @Operation(summary = "List sheets within a spreadsheet", description = "Returns the available sheet tabs for the given spreadsheet.")
  public java.util.List<GoogleSheetMetadataResponse> sheets(@PathVariable String spreadsheetId) {
    return importService.listSheets(spreadsheetId);
  }

  @PostMapping("/webhook")
  @Operation(summary = "Google Sheet webhook", description = "Endpoint used by Google Apps Script to push appended rows. Implementation forthcoming.")
  public ResponseEntity<Void> webhook(@RequestBody GoogleSheetWebhookPayload payload) {
    log.info("Received Google Sheets webhook for domain={} sheet={} tab={} rowIndex={} (stub handler)",
        payload.domain(), payload.spreadsheetId(), payload.tabName(), payload.rowIndex());
    return ResponseEntity.accepted().build();
  }
}
