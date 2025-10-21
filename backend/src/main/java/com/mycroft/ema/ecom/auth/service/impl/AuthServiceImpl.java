package com.mycroft.ema.ecom.auth.service.impl;

import com.mycroft.ema.ecom.auth.domain.PasswordResetToken;
import com.mycroft.ema.ecom.auth.domain.RefreshToken;
import com.mycroft.ema.ecom.auth.repo.PasswordResetTokenRepository;
import com.mycroft.ema.ecom.auth.repo.RefreshTokenRepository;
import com.mycroft.ema.ecom.auth.repo.UserRepository;
import com.mycroft.ema.ecom.auth.service.AuthService;
import com.mycroft.ema.ecom.auth.service.JwtService;
import com.mycroft.ema.ecom.common.error.NotFoundException;
import com.mycroft.ema.ecom.common.mail.MailService;
import jakarta.transaction.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Service
public class AuthServiceImpl implements AuthService {

  private static final Logger log = LoggerFactory.getLogger(AuthServiceImpl.class);

  private final UserRepository users;
  private final RefreshTokenRepository refreshTokens;
  private final PasswordResetTokenRepository resetTokens;
  private final JwtService jwt;
  private final PasswordEncoder encoder;
  private final MailService mail;

  @Value("${app.frontend-base-url:http://localhost:4200}")
  private String frontendBaseUrl;

  public AuthServiceImpl(UserRepository users, RefreshTokenRepository refreshTokens, PasswordResetTokenRepository resetTokens, JwtService jwt, PasswordEncoder encoder, MailService mail) {
    this.users = users;
    this.refreshTokens = refreshTokens;
    this.resetTokens = resetTokens;
    this.jwt = jwt;
    this.encoder = encoder;
    this.mail = mail;
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
    var rt = refreshTokens.findByToken(refreshToken).orElseThrow(()->new IllegalArgumentException("Invalid refresh token"));
    if(!rt.isActive()) throw new IllegalArgumentException("Refresh token expired/revoked");
    var user = rt.getUser();
    return new TokenPair(jwt.generateAccessToken(user), refreshToken);
  }

  @Override
  @Transactional
  public void logout(String refreshToken){ refreshTokens.findByToken(refreshToken)
          .ifPresent(rt -> { rt.setRevoked(true); refreshTokens.save(rt); });
  }

  @Override
  @Transactional
  public void forgotPassword(String identifier) {
    try {
      Optional<com.mycroft.ema.ecom.auth.domain.User> userOpt = users.findByUsernameIgnoreCase(identifier);
      if (userOpt.isEmpty()) {
        userOpt = users.findByEmailIgnoreCase(identifier);
      }
      if (userOpt.isPresent()) {
        var user = userOpt.get();
        if (user.isEnabled() && user.getEmail() != null && !user.getEmail().isBlank()) {
          var token = new PasswordResetToken();
          token.setToken(UUID.randomUUID().toString());
          token.setUser(user);
          token.setExpiresAt(Instant.now().plusSeconds(60L * 60L)); // 1 hour
          resetTokens.save(token);

          String url = frontendBaseUrl.replaceAll("/$", "") + "/reset-password?token=" + token.getToken();
          String subject = "EMA E-commerce: Password reset";
          String body = "Hello " + user.getUsername() + ",\n\n" +
                  "We received a request to reset your password.\n" +
                  "Please use the link below to set a new password. The link is valid for 1 hour.\n\n" +
                  url + "\n\n" +
                  "If you did not request this, you can safely ignore this email.";
          mail.send(user.getEmail(), subject, body);
        }
      }
    } catch (Exception e) {
      log.warn("Error handling forgotPassword for '{}': {}", identifier, e.toString());
    }
    // Always return normally to avoid user enumeration
  }
}
