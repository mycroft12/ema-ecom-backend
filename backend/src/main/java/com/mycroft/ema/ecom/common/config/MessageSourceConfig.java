package com.mycroft.ema.ecom.common.config;

import org.springframework.context.MessageSource;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.support.ReloadableResourceBundleMessageSource;

/**
 * Configures the message source used for internationalized validation and error messages.
 */
@Configuration
public class MessageSourceConfig {
  @Bean
  MessageSource messageSource(){
    var ms = new ReloadableResourceBundleMessageSource();
    ms.setBasenames("classpath:i18n/messages");
    ms.setDefaultEncoding("UTF-8");
    ms.setFallbackToSystemLocale(false);
    return ms;
  }
}
