package com.mycroft.ema.ecom.auth.service;


import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.mycroft.ema.ecom.auth.domain.Role;
import com.mycroft.ema.ecom.auth.domain.User;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.Date;

@Service
public class JwtService {

  private final Algorithm algorithm;
  private final String issuer;
  private final long accessTtlSeconds;
  private final JdbcTemplate jdbcTemplate;

  public JwtService(@Value("${app.jwt.secret}") String secret, @Value("${app.jwt.issuer:ema-ecom}") String issuer ,
                    @Value("${app.jwt.access-ttl-seconds:900}") long accessTtlSeconds,
                    JdbcTemplate jdbcTemplate) {
    this.algorithm = Algorithm.HMAC256(secret);
    this.issuer = issuer; this.accessTtlSeconds = accessTtlSeconds;
    this.jdbcTemplate = jdbcTemplate;
  }

  public String generateAccessToken(User user){
    var now = Instant.now();

    // Extract permissions from roles
    var permissions = user.getRoles().stream()
        .flatMap(r -> r.getPermissions().stream())
        .map(p -> p.getName())
        .distinct()
        .toList();

    return JWT.create()
        .withIssuer(issuer)
        .withSubject(user.getId().toString())
        .withClaim("username", user.getUsername())
        .withClaim("roles", user.getRoles().stream().map(Role::getName).toList())
        .withClaim("permissions", permissions) // Add permissions to the token
        .withIssuedAt(Date.from(now))
        .withExpiresAt(Date.from(now.plusSeconds(accessTtlSeconds)))
        .sign(algorithm);
  }

  public com.auth0.jwt.interfaces.DecodedJWT verify(String token){
    return JWT.require(algorithm).withIssuer(issuer).build().verify(token);
  }

  public void assertRefreshTokenExists(String refreshToken) {
    try {
      Integer count = jdbcTemplate.queryForObject(
          "select count(*) from refresh_tokens where token = ?",
          Integer.class,
          refreshToken
      );
      if (count == null || count == 0) {
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid refresh token");
      }
    } catch (Exception ex) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid refresh token", ex);
    }
  }

}
