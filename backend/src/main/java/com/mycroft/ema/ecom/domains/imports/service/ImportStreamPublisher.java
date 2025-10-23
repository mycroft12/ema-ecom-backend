package com.mycroft.ema.ecom.domains.imports.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class ImportStreamPublisher {

  private static final Logger log = LoggerFactory.getLogger(ImportStreamPublisher.class);

  public void publishRowUpserted(String domain, Map<String, Object> payload) {
    log.debug("[STREAM-STUB] domain={} payload={}", domain, payload);
  }
}
