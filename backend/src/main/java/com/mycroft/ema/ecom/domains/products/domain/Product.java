package com.mycroft.ema.ecom.domains.products.domain;

import com.mycroft.ema.ecom.common.persistence.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/**
 * Generic dynamic entity for products domain.
 * With the new architecture, columns are defined at runtime from the Excel template
 * and materialized in the table `product_config`. We intentionally avoid declaring
 * any static fields here beyond BaseEntity (id, audit fields).
 */
@Entity
@Table(name = "product_config")
@Getter
@Setter
public class Product extends BaseEntity {
  // No static columns here; structure is managed dynamically by import configuration.
}
