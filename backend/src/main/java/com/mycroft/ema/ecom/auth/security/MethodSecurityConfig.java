package com.mycroft.ema.ecom.auth.security;

import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;

/**
 * Enables method-level security annotations such as @PreAuthorize across the application.
 */
@Configuration
@EnableMethodSecurity
public class MethodSecurityConfig {}
