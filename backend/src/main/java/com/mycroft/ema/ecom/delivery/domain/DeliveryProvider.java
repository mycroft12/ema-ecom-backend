package com.mycroft.ema.ecom.delivery.domain;

import com.mycroft.ema.ecom.common.persistence.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "delivery_providers")
@Getter
@Setter
public class DeliveryProvider extends BaseEntity {

    @Column(nullable = false, unique = true)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private DeliveryType type; // ENTERPRISE, INDIVIDUAL, INTERNAL

    @Column(name = "contact_name")
    private String contactName;

    @Column(name = "contact_email")
    private String contactEmail;

    @Column(name = "contact_phone")
    private String contactPhone;

    @Column(name = "active", nullable = false)
    private boolean active = true;
}
