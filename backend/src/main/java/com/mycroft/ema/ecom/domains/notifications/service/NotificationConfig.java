package com.mycroft.ema.ecom.domains.notifications.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mycroft.ema.ecom.domains.notifications.dto.NotificationLogMapper;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class NotificationConfig {

  @Bean
  public NotificationLogMapper notificationLogMapper(ObjectMapper mapper) {
    return new NotificationLogMapper(mapper);
  }
}
