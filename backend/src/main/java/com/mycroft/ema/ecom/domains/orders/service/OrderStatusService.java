package com.mycroft.ema.ecom.domains.orders.service;

import com.mycroft.ema.ecom.common.error.BadRequestException;
import com.mycroft.ema.ecom.domains.orders.domain.OrderStatus;
import com.mycroft.ema.ecom.domains.orders.dto.OrderStatusDto;
import com.mycroft.ema.ecom.domains.orders.dto.OrderStatusRequest;
import com.mycroft.ema.ecom.domains.orders.repo.OrderStatusRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
public class OrderStatusService {

  private final OrderStatusRepository repository;
  private final JdbcTemplate jdbcTemplate;

  public OrderStatusService(OrderStatusRepository repository, JdbcTemplate jdbcTemplate) {
    this.repository = repository;
    this.jdbcTemplate = jdbcTemplate;
  }

  @Transactional(readOnly = true)
  public List<OrderStatusDto> list() {
    return repository.findAllByOrderByDisplayOrderAscNameAsc().stream()
        .map(this::toDto)
        .toList();
  }

  @Transactional
  public OrderStatusDto create(OrderStatusRequest request) {
    if (repository.existsByNameIgnoreCase(request.name())) {
      throw new BadRequestException("order-status.alreadyExists");
    }
    OrderStatus status = new OrderStatus();
    status.setName(request.name().trim());
    status.setDisplayOrder(normalizeOrder(request.displayOrder()));
    return toDto(repository.save(status));
  }

  @Transactional
  public OrderStatusDto update(UUID id, OrderStatusRequest request) {
    OrderStatus existing = repository.findById(id)
        .orElseThrow(() -> new BadRequestException("order-status.notFound"));
    String normalizedName = request.name().trim();
    repository.findByNameIgnoreCase(normalizedName)
        .filter(other -> !other.getId().equals(id))
        .ifPresent(other -> {
          throw new BadRequestException("order-status.alreadyExists");
        });
    existing.setName(normalizedName);
    existing.setDisplayOrder(normalizeOrder(request.displayOrder()));
    return toDto(repository.save(existing));
  }

  @Transactional
  public void delete(UUID id) {
    OrderStatus status = repository.findById(id)
        .orElseThrow(() -> new BadRequestException("order-status.notFound"));
    if (isStatusInUse(status.getName())) {
      throw new BadRequestException("order-status.inUse");
    }
    repository.delete(status);
  }

  private boolean isStatusInUse(String statusName) {
    if (statusName == null || statusName.isBlank()) {
      return false;
    }
    try {
      Long count = jdbcTemplate.queryForObject(
          "select count(*) from orders_config where lower(status) = ?",
          Long.class,
          statusName.trim().toLowerCase(Locale.ROOT)
      );
      return count != null && count > 0;
    } catch (Exception ex) {
      return false;
    }
  }

  private int normalizeOrder(Integer value) {
    return value == null ? 0 : Math.max(0, value);
  }

  private OrderStatusDto toDto(OrderStatus entity) {
    return new OrderStatusDto(entity.getId(), entity.getName(), entity.getDisplayOrder());
  }
}
