package com.mycroft.ema.ecom.delivery.repo;

import com.mycroft.ema.ecom.delivery.domain.DeliveryProvider;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface DeliveryProviderRepository extends JpaRepository<DeliveryProvider, UUID> {
    Optional<DeliveryProvider> findByNameIgnoreCase(String name);
}
