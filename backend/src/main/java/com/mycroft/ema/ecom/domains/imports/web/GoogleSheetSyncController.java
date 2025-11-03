package com.mycroft.ema.ecom.domains.imports.web;

import com.mycroft.ema.ecom.auth.domain.User;
import com.mycroft.ema.ecom.auth.repo.UserRepository;
import com.mycroft.ema.ecom.auth.service.JwtService;
import com.mycroft.ema.ecom.domains.imports.dto.GoogleSheetSyncRequest;
import com.mycroft.ema.ecom.domains.imports.service.GoogleSheetSyncService;
import com.mycroft.ema.ecom.integration.google.config.GoogleSheetsProperties;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;
import java.util.UUID;

/**
 * Webhook endpoint that authorizes and processes incremental row syncs coming from Google Sheets automations.
 */
@RestController
@RequestMapping("/api/import/google")
public class GoogleSheetSyncController {

  private final GoogleSheetSyncService syncService;
  private final GoogleSheetsProperties properties;
  private final JwtService jwtService;
  private final UserRepository userRepository;

  public GoogleSheetSyncController(GoogleSheetSyncService syncService,
                                   GoogleSheetsProperties properties,
                                   JwtService jwtService,
                                   UserRepository userRepository) {
    this.syncService = syncService;
    this.properties = properties;
    this.jwtService = jwtService;
    this.userRepository = userRepository;
  }

  @PostMapping("/sync")
  public ResponseEntity<?> sync(Authentication authentication,
                                @RequestHeader(name = "X-Webhook-Secret", required = false) String secret,
                                @RequestParam(name = "token", required = false) String token,
                                @RequestBody GoogleSheetSyncRequest request) {
    if (!isAuthorized(authentication, secret, token)) {
      return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access Denied"));
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

  private boolean isAuthorized(Authentication authentication, String providedSecret, String tokenParam) {
    if (authentication != null && authentication.isAuthenticated()) {
      for (GrantedAuthority authority : authentication.getAuthorities()) {
        if ("import:configure".equalsIgnoreCase(authority.getAuthority())) {
          return true;
        }
      }
    }

    if (tokenParam != null && !tokenParam.isBlank()) {
      User user = validateToken(tokenParam.trim());
      if (userHasImportPermission(user)) {
        return true;
      }
    }

    String expectedSecret = properties.webhookSecret();
    if (expectedSecret != null && !expectedSecret.isBlank()) {
      return expectedSecret.equals(providedSecret);
    }
    return false;
  }

  private User validateToken(String token) {
    try {
      var decoded = jwtService.verify(token);
      UUID userId = UUID.fromString(decoded.getSubject());
      return userRepository.findById(userId)
          .filter(User::isEnabled)
          .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid token"));
    } catch (Exception ex) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid token");
    }
  }

  private boolean userHasImportPermission(User user) {
    if (user == null || user.getRoles() == null) {
      return false;
    }
    return user.getRoles().stream()
        .flatMap(role -> role.getPermissions().stream())
        .anyMatch(permission -> "import:configure".equalsIgnoreCase(permission.getName()));
  }
}
