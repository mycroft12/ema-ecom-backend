package com.mycroft.ema.ecom.auth.service;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.mycroft.ema.ecom.auth.domain.Role;
import com.mycroft.ema.ecom.auth.domain.User;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Date;

@Service
public class JwtService {

  private final Algorithm algorithm;
  private final String issuer;
  private final long accessTtlSeconds;

  public JwtService(@Value("${app.jwt.secret}") String secret, @Value("${app.jwt.issuer:ema-ecom}") String issuer ,
                    @Value("${app.jwt.access-ttl-seconds:900}") long accessTtlSeconds) {
    this.algorithm = Algorithm.HMAC256(secret);
    this.issuer = issuer; this.accessTtlSeconds = accessTtlSeconds;
  }

  public String generateAccessToken(User user){
    var now = Instant.now();
    return JWT.create()
        .withIssuer(issuer)
        .withSubject(user.getId().toString())
        .withClaim("username", user.getUsername())
        .withClaim("roles", user.getRoles().stream().map(Role::getName).toList())
        .withIssuedAt(Date.from(now))
        .withExpiresAt(Date.from(now.plusSeconds(accessTtlSeconds)))
        .sign(algorithm);
  }

  public com.auth0.jwt.interfaces.DecodedJWT verify(String token){
    return JWT.require(algorithm).withIssuer(issuer).build().verify(token);
  }

}
