package com.mycroft.ema.ecom.domains.imports.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.Duration;
import java.util.List;
import java.util.Objects;
import java.util.concurrent.CopyOnWriteArrayList;

@Component
public class ProductUpsertBroadcaster {

  private static final Logger log = LoggerFactory.getLogger(ProductUpsertBroadcaster.class);
  private static final long DEFAULT_TIMEOUT = Duration.ofMinutes(30).toMillis();

  private record Registration(String domain, SseEmitter emitter) {}

  private final List<Registration> emitters = new CopyOnWriteArrayList<>();

  public SseEmitter register(String domain) {
    String resolvedDomain = domain == null ? "product" : domain.trim().toLowerCase();
    SseEmitter emitter = new SseEmitter(DEFAULT_TIMEOUT);
    Registration registration = new Registration(resolvedDomain, emitter);
    emitters.add(registration);
    log.debug("Registered SSE listener for domain {} (total emitters: {})", resolvedDomain, emitters.size());

    emitter.onCompletion(() -> emitters.remove(registration));
    emitter.onTimeout(() -> emitters.remove(registration));
    emitter.onError(ex -> {
      emitters.remove(registration);
      log.debug("SSE emitter removed due to error: {}", ex.getMessage());
    });

    try {
      emitter.send(SseEmitter.event().name("init").data("connected"));
    } catch (IOException ignored) {}

    return emitter;
  }

  public void broadcast(ProductUpsertEvent event) {
    if (event == null) {
      return;
    }
    emitters.stream()
        .filter(reg -> Objects.equals(reg.domain, event.domain()))
        .toList()
        .forEach(reg -> {
          try {
            reg.emitter.send(SseEmitter.event().name("upsert").data(event));
            log.debug("Broadcasted upsert event for domain {} to emitter", event.domain());
          } catch (IOException ex) {
            emitters.remove(reg);
            log.debug("Removed SSE emitter after send failure: {}", ex.getMessage());
          }
        });
  }
}
