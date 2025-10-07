package com.mycroft.ema.ecom.products.domain;

import com.mycroft.ema.ecom.common.persistence.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Table(name = "products")
@Getter
@Setter
public class Product extends BaseEntity {
  @Column(nullable = false)
  private String title;

  private String reference;

  private String description;

  @Column(precision = 18, scale = 2)
  private BigDecimal buyPrice;

  @Column(precision = 18, scale = 2)
  private BigDecimal sellPrice;

  @Column(precision = 18, scale = 2)
  private BigDecimal affiliateCommission;

  @Column(columnDefinition = "bytea")
  private byte[] picture; // blob stored as PostgreSQL bytea
}
