package com.mycroft.ema.ecom.domains.orders.service;

import com.mycroft.ema.ecom.common.error.BadRequestException;
import com.mycroft.ema.ecom.domains.orders.domain.OrderStatus;
import com.mycroft.ema.ecom.domains.orders.dto.OrderStatusDto;
import com.mycroft.ema.ecom.domains.orders.dto.OrderStatusRequest;
import com.mycroft.ema.ecom.domains.orders.repo.OrderStatusRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.text.Normalizer;
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
    String code = generateCode(request.labelEn());
    if (!StringUtils.hasText(code)) {
      code = generateCode(request.labelFr());
    }
    if (!StringUtils.hasText(code)) {
      code = "status_" + UUID.randomUUID().toString().replaceAll("-", "").substring(0, 8);
    }
    if (repository.existsByNameIgnoreCase(code)) {
      throw new BadRequestException("order-status.alreadyExists");
    }
    OrderStatus status = new OrderStatus();
    status.setName(code);
    status.setLabelEn(request.labelEn().trim());
    status.setLabelFr(request.labelFr().trim());
    status.setDisplayOrder(normalizeOrder(request.displayOrder()));
    return toDto(repository.save(status));
  }

  @Transactional
  public OrderStatusDto update(UUID id, OrderStatusRequest request) {
    OrderStatus existing = repository.findById(id)
        .orElseThrow(() -> new BadRequestException("order-status.notFound"));
    existing.setLabelEn(request.labelEn().trim());
    existing.setLabelFr(request.labelFr().trim());
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
    return new OrderStatusDto(entity.getId(), entity.getName(), entity.getDisplayOrder(), entity.getLabelEn(), entity.getLabelFr());
  }

  private String generateCode(String label) {
    if (!StringUtils.hasText(label)) {
      return "";
    }
    String normalized = Normalizer.normalize(label, Normalizer.Form.NFD)
        .replaceAll("\\p{InCombiningDiacriticalMarks}+", "")
        .replaceAll("[^a-zA-Z0-9]+", "_")
        .replaceAll("_+", "_")
        .toLowerCase(Locale.ROOT);
    return normalized.replaceAll("^_+|_+$", "");
  }
}
