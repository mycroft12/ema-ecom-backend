package com.mycroft.ema.ecom.domains.imports.web;

import com.mycroft.ema.ecom.auth.repo.UserRepository;
import com.mycroft.ema.ecom.auth.service.JwtService;
import com.mycroft.ema.ecom.domains.imports.service.ProductUpsertBroadcaster;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.UUID;

@RestController
public class ProductUpsertStreamController {

  private final ProductUpsertBroadcaster broadcaster;
  private final JwtService jwtService;
  private final UserRepository userRepository;
  private static final Logger log = LoggerFactory.getLogger(ProductUpsertStreamController.class);

  public ProductUpsertStreamController(ProductUpsertBroadcaster broadcaster,
                                       JwtService jwtService,
                                       UserRepository userRepository) {
    this.broadcaster = broadcaster;
    this.jwtService = jwtService;
    this.userRepository = userRepository;
  }

  @GetMapping("/api/products/upserts/stream")
  public SseEmitter stream(@RequestParam(defaultValue = "product") String domain,
                           @RequestParam(name = "token", required = false) String token) {
    var userId = validateToken(token);
    log.debug("SSE stream registered for domain {} by user {}", domain, userId);
    return broadcaster.register(domain == null ? "product" : domain.trim().toLowerCase());
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
