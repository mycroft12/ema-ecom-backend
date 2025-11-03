package com.mycroft.ema.ecom.common.persistence;

import jakarta.persistence.*;
import lombok.Getter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.Instant;
import java.util.UUID;

/**
 * Base JPA entity that supplies an immutable identifier together with automatic creation and update timestamps.
 */
@MappedSuperclass
@Getter
public abstract class BaseEntity {
  @Id
  @GeneratedValue
  private UUID id;

  @CreationTimestamp
  @Column(nullable=false, updatable=false)
  private Instant createdAt;

  @UpdateTimestamp
  @Column(nullable=false)
  private Instant updatedAt;
}
