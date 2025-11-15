package com.mycroft.ema.ecom.domains.orders.repo;

import com.mycroft.ema.ecom.domains.orders.domain.OrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface OrderStatusRepository extends JpaRepository<OrderStatus, UUID> {
  Optional<OrderStatus> findByNameIgnoreCase(String name);
  List<OrderStatus> findAllByOrderByDisplayOrderAscNameAsc();
  boolean existsByNameIgnoreCase(String name);
}
