package com.mycroft.ema.ecom.auth.service.impl;

import com.mycroft.ema.ecom.auth.domain.RefreshToken;
import com.mycroft.ema.ecom.auth.repo.RefreshTokenRepository;
import com.mycroft.ema.ecom.auth.repo.UserRepository;
import com.mycroft.ema.ecom.auth.service.AuthService;
import com.mycroft.ema.ecom.auth.service.JwtService;
import com.mycroft.ema.ecom.common.error.BadRequestException;
import com.mycroft.ema.ecom.common.error.NotFoundException;
import jakarta.transaction.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.UUID;

/**
 * Default authentication workflow implementation backed by JWTs and persistent refresh tokens.
 */
@Service
public class AuthServiceImpl implements AuthService {

  private static final Logger log = LoggerFactory.getLogger(AuthServiceImpl.class);

  private final UserRepository users;
  private final RefreshTokenRepository refreshTokens;
  private final JwtService jwt;
  private final PasswordEncoder encoder;

  public AuthServiceImpl(UserRepository users, RefreshTokenRepository refreshTokens, JwtService jwt, PasswordEncoder encoder) {
    this.users = users;
    this.refreshTokens = refreshTokens;
    this.jwt = jwt;
    this.encoder = encoder;
  }

  @Override
  @Transactional
  public TokenPair login(LoginRequest req){
    var userOpt = users.findByUsername(req.username());
    var user = userOpt.orElse(null);
    if (user == null || !encoder.matches(req.password(), user.getPassword())) {
      throw new org.springframework.security.authentication.BadCredentialsException("bad_credentials");
    }
    if (!user.isEnabled()) {
      throw new org.springframework.security.authentication.DisabledException("account_disabled");
    }
    if (refreshTokens.existsByUserAndRevokedFalseAndExpiresAtAfter(user, Instant.now())) {
      throw new BadRequestException("auth.session.active");
    }
    var access = jwt.generateAccessToken(user);
    var refresh = new RefreshToken();
    refresh.setToken(UUID.randomUUID().toString());
    refresh.setUser(user);
    refresh.setExpiresAt(Instant.now().plusSeconds(60L*60L*24L*7L));
    refreshTokens.save(refresh);
    return new TokenPair(access, refresh.getToken());
  }

  @Override
  @Transactional
  public TokenPair refresh(String refreshToken){
    jwt.assertRefreshTokenExists(refreshToken);
    var rt = refreshTokens.findByToken(refreshToken).orElseThrow(()->new IllegalArgumentException("Invalid refresh token"));
    if(!rt.isActive()) throw new IllegalArgumentException("Refresh token expired/revoked");
    var user = rt.getUser();
    return new TokenPair(jwt.generateAccessToken(user), refreshToken);
  }

  @Override
  @Transactional
  public void logout(String refreshToken){
    if (refreshToken == null || refreshToken.isBlank()) {
      return;
    }
    refreshTokens.deleteByToken(refreshToken);
  }
}
