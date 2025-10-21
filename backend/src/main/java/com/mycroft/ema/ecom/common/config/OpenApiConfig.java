package com.mycroft.ema.ecom.common.config;

import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import io.swagger.v3.oas.models.OpenAPI;
import org.springdoc.core.models.GroupedOpenApi;

@Configuration
public class OpenApiConfig {
  @Bean
  OpenAPI api() {
    return new OpenAPI().info(new Info()
        .title("EMA E-commerce API")
        .description("Employees • Products")
        .version("v1"));
  }

}
