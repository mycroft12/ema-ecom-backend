package com.mycroft.ema.ecom.domains.imports.web;

import com.mycroft.ema.ecom.domains.imports.dto.GoogleSheetSyncRequest;
import com.mycroft.ema.ecom.domains.imports.service.GoogleSheetSyncService;
import com.mycroft.ema.ecom.integration.google.GoogleSheetsProperties;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/import/google")
public class GoogleSheetSyncController {

  private final GoogleSheetSyncService syncService;
  private final GoogleSheetsProperties properties;

  public GoogleSheetSyncController(GoogleSheetSyncService syncService,
                                   GoogleSheetsProperties properties) {
    this.syncService = syncService;
    this.properties = properties;
  }

  @PostMapping("/sync")
  public ResponseEntity<?> sync(@RequestHeader(name = "X-Webhook-Secret", required = false) String secret,
                                @RequestBody GoogleSheetSyncRequest request) {
    if (secret == null || secret.isBlank() || !secret.equals(properties.webhookSecret())) {
      return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid webhook secret"));
    }
    try {
      syncService.syncRow(request);
      return ResponseEntity.accepted().build();
    } catch (IllegalArgumentException ex) {
      return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
    } catch (Exception ex) {
      return ResponseEntity.internalServerError().body(Map.of("error", "Failed to process sync request"));
    }
  }
}
