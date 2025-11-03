package com.mycroft.ema.ecom.integration.google.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Module configuration that activates binding for {@link GoogleSheetsProperties}.
 */
@Configuration
@EnableConfigurationProperties(GoogleSheetsProperties.class)
public class GoogleIntegrationConfig {
}
