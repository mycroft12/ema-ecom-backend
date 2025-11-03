package com.mycroft.ema.ecom.domains.imports.web;

import com.mycroft.ema.ecom.auth.repo.UserRepository;
import com.mycroft.ema.ecom.auth.service.JwtService;
import com.mycroft.ema.ecom.domains.imports.service.HybridUpsertBroadcaster;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Locale;
import java.util.UUID;

/**
 * Establishes server-sent event streams so clients can react to hybrid entity upsert notifications in real time.
 */
@RestController
public class HybridUpsertStreamController {

  private final HybridUpsertBroadcaster broadcaster;
  private final JwtService jwtService;
  private final UserRepository userRepository;
  private static final Logger log = LoggerFactory.getLogger(HybridUpsertStreamController.class);

  public HybridUpsertStreamController(HybridUpsertBroadcaster broadcaster,
                                      JwtService jwtService,
                                      UserRepository userRepository) {
    this.broadcaster = broadcaster;
    this.jwtService = jwtService;
    this.userRepository = userRepository;
  }

  @GetMapping("/api/hybrid/{entityType}/upserts/stream")
  public SseEmitter stream(@PathVariable String entityType,
                           @RequestParam(name = "domain", required = false) String domainOverride,
                           @RequestParam(name = "token", required = false) String token) {
    var userId = validateToken(token);
    String domain = resolveDomain(entityType, domainOverride);
    log.debug("SSE stream registered for domain {} by user {}", domain, userId);
    return broadcaster.register(domain);
  }

  private String resolveDomain(String entityType, String override) {
    if (override != null && !override.isBlank()) {
      return override.trim().toLowerCase(Locale.ROOT);
    }
    if (entityType == null || entityType.isBlank()) {
      return "product";
    }
    return entityType.trim().toLowerCase(Locale.ROOT);
  }

  private java.util.UUID validateToken(String token) {
    if (token == null || token.isBlank()) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing token");
    }
    try {
      var decoded = jwtService.verify(token.trim());
      UUID userId = UUID.fromString(decoded.getSubject());
      userRepository.findById(userId)
          .filter(user -> user.isEnabled())
          .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid token"));
      return userId;
    } catch (Exception ex) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid token");
    }
  }
}
