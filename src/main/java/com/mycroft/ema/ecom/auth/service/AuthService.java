package com.mycroft.ema.ecom.auth.service;

import com.mycroft.ema.ecom.auth.domain.RefreshToken;
import com.mycroft.ema.ecom.auth.repo.RefreshTokenRepository;
import com.mycroft.ema.ecom.auth.repo.UserRepository;
import com.mycroft.ema.ecom.common.error.NotFoundException;
import jakarta.transaction.Transactional;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant; import java.util.UUID;

@Service
public class AuthService {

  private final UserRepository users;
  private final RefreshTokenRepository refreshTokens;
  private final JwtService jwt;
  private final PasswordEncoder encoder;

  public AuthService(UserRepository users, RefreshTokenRepository refreshTokens, JwtService jwt, PasswordEncoder encoder) {
    this.users = users;
    this.refreshTokens = refreshTokens;
    this.jwt = jwt;
    this.encoder = encoder;
  }

  public record LoginRequest(String username, String password) {}
  public record TokenPair(String accessToken, String refreshToken) {}

  @Transactional
  public TokenPair login(LoginRequest req){
    var user = users.findByUsername(req.username()).orElseThrow(()-> new NotFoundException("User not found"));
    if (!user.isEnabled() || !encoder.matches(req.password(), user.getPassword())) throw new IllegalArgumentException("Bad credentials");
    var access = jwt.generateAccessToken(user);
    var refresh = new RefreshToken();
    refresh.setToken(UUID.randomUUID().toString());
    refresh.setUser(user);
    refresh.setExpiresAt(Instant.now().plusSeconds(60L*60L*24L*7L));
    refreshTokens.save(refresh);
    return new TokenPair(access, refresh.getToken());
  }

  @Transactional
  public TokenPair refresh(String refreshToken){
    var rt = refreshTokens.findByToken(refreshToken).orElseThrow(()->new IllegalArgumentException("Invalid refresh token"));
    if(!rt.isActive()) throw new IllegalArgumentException("Refresh token expired/revoked");
    var user = rt.getUser();
    return new TokenPair(jwt.generateAccessToken(user), refreshToken);
  }

  @Transactional
  public void logout(String refreshToken){ refreshTokens.findByToken(refreshToken)
          .ifPresent(rt -> { rt.setRevoked(true); refreshTokens.save(rt); });
  }

}
