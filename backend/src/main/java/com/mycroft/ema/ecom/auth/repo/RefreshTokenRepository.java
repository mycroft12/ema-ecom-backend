package com.mycroft.ema.ecom.auth.repo;

import com.mycroft.ema.ecom.auth.domain.RefreshToken;
import com.mycroft.ema.ecom.auth.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {
    Optional<RefreshToken> findByToken(String token);
    long deleteByUser(User user);
}
