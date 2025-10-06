package com.mycroft.ema.ecom.auth.domain;

import com.mycroft.ema.ecom.common.persistence.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter; import lombok.Setter;

import java.time.Instant;

@Entity @Table(name="refresh_tokens")
@Getter @Setter
public class RefreshToken extends BaseEntity {
  @Column(nullable = false, unique = true)
  private String token;
  @ManyToOne(optional = false) private User user;
  @Column(nullable = false) private Instant expiresAt;
  @Column(nullable = false) private boolean revoked = false;

  public boolean isActive(){ return !revoked && Instant.now().isBefore(expiresAt); }
}
