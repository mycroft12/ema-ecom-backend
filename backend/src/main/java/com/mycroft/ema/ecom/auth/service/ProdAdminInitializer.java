package com.mycroft.ema.ecom.auth.service;

import com.mycroft.ema.ecom.auth.domain.Role;
import com.mycroft.ema.ecom.auth.domain.User;
import com.mycroft.ema.ecom.auth.repo.RoleRepository;
import com.mycroft.ema.ecom.auth.repo.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.Set;

/**
 * Optional admin seeder for production-like environments.
 * Enabled only when app.auth.admin.seed.enabled=true.
 */
@Component
@Profile("!dev")
@ConditionalOnProperty(name = "app.auth.admin.seed.enabled", havingValue = "true")
@Order(90)
public class ProdAdminInitializer implements CommandLineRunner {

  private static final Logger log = LoggerFactory.getLogger(ProdAdminInitializer.class);

  private final UserRepository users;
  private final RoleRepository roles;
  private final PasswordEncoder encoder;

  @Value("${app.auth.admin.username:admin}")
  private String adminUsername;
  @Value("${app.auth.admin.password:admin}")
  private String adminPassword;
  @Value("${app.auth.admin.seed.reset-password:false}")
  private boolean resetPassword;

  public ProdAdminInitializer(UserRepository users, RoleRepository roles, PasswordEncoder encoder) {
    this.users = users;
    this.roles = roles;
    this.encoder = encoder;
  }

  @Override
  public void run(String... args) {
    ensureAdmin();
  }

  private void ensureAdmin() {
    Role adminRole = roles.findByName("ADMIN").orElseGet(() -> {
      Role r = new Role();
      r.setName("ADMIN");
      return roles.save(r);
    });

    Optional<User> existing = users.findByUsername(adminUsername);
    if (existing.isEmpty()) {
      User u = new User();
      u.setUsername(adminUsername);
      u.setEmail("contact@admin.com");
      u.setPassword(encoder.encode(adminPassword));
      u.setEnabled(true);
      u.setRoles(Set.of(adminRole));
      users.save(u);
      log.info("[PROD] Created admin user '{}'", adminUsername);
      return;
    }

    User u = existing.get();
    if (u.getRoles() == null || u.getRoles().stream().noneMatch(r -> "ADMIN".equalsIgnoreCase(r.getName()))) {
      u.setRoles(java.util.stream.Stream.concat(
          u.getRoles() == null ? java.util.stream.Stream.empty() : u.getRoles().stream(),
          java.util.stream.Stream.of(adminRole)
      ).collect(java.util.stream.Collectors.toSet()));
    }
    if (resetPassword && !encoder.matches(adminPassword, u.getPassword())) {
      u.setPassword(encoder.encode(adminPassword));
      log.warn("[PROD] Reset admin password to configured value (app.auth.admin.seed.reset-password=true).");
    }
    users.save(u);
  }
}
