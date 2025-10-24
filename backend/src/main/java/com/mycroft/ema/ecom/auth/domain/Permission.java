package com.mycroft.ema.ecom.auth.domain;

import com.mycroft.ema.ecom.common.persistence.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter; import lombok.Setter;

@Entity
@Table(name="permissions")
@Getter
@Setter
public class Permission extends BaseEntity {
  @Column(unique = true, nullable = false)
  private String name; // e.g. product:create
}
