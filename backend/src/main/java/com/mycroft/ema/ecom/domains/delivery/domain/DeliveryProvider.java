package com.mycroft.ema.ecom.domains.delivery.domain;

import com.mycroft.ema.ecom.common.persistence.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "delivery_config")
@Getter
@Setter
public class DeliveryProvider extends BaseEntity {
    // Generic dynamic entity for delivery domain.
    // Structure (columns) is managed dynamically based on Excel template import.
}
