package com.mycroft.ema.ecom.auth.service;

import com.mycroft.ema.ecom.auth.repo.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Dev-only initializer to ensure the seeded admin user can log in with admin/admin.
 * This adjusts the stored hash at startup if it doesn't match the expected raw password "admin".
 * It does NOT run in production profiles.
 */
@Component
@Profile("dev")
public class DevAdminInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DevAdminInitializer.class);

    private final UserRepository users;
    private final PasswordEncoder encoder;

    public DevAdminInitializer(UserRepository users, PasswordEncoder encoder) {
        this.users = users;
        this.encoder = encoder;
    }

    @Override
    public void run(String... args) {
        users.findByUsername("admin").ifPresent(user -> {
            try {
                if (!encoder.matches("admin", user.getPassword())) {
                    user.setPassword(encoder.encode("admin"));
                    users.save(user);
                    log.info("[DEV] Reset admin password hash to match 'admin'.");
                } else {
                    log.debug("[DEV] Admin password already matches expected value.");
                }
            } catch (Exception ex) {
                log.warn("[DEV] Unable to verify/reset admin password: {}", ex.getMessage());
            }
        });
    }
}
