package com.mycroft.ema.ecom.common.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Redirect convenient Swagger endpoints to the actual Swagger UI page.
 * This prevents NoResourceFoundException when accessing /swagger-ui or /swagger.
 */
@Configuration
public class SwaggerUiRedirectConfig implements WebMvcConfigurer {
  @Override
  public void addViewControllers(ViewControllerRegistry registry) {
    registry.addRedirectViewController("/swagger", "/swagger-ui.html");
    registry.addRedirectViewController("/swagger-ui", "/swagger-ui.html");
  }
}
