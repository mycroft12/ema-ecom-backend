package com.mycroft.ema.ecom.integration.google.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(GoogleSheetsProperties.class)
public class GoogleIntegrationConfig {
}
