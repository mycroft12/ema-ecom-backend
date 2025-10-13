package com.mycroft.ema.ecom.domains.delivery.repo;

import com.mycroft.ema.ecom.domains.delivery.domain.DeliveryProvider;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface DeliveryProviderRepository extends JpaRepository<DeliveryProvider, UUID> {
}
