package com.mycroft.ema.ecom.domains.orders.domain;

import com.mycroft.ema.ecom.common.persistence.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/**
 * Reference entity describing the lifecycle stages that an order can take.
 */
@Entity
@Table(name = "order_statuses")
@Getter
@Setter
public class OrderStatus extends BaseEntity {

  @Column(nullable = false, unique = true, length = 100)
  private String name;

  @Column(name = "display_order", nullable = false)
  private Integer displayOrder = 0;
}
