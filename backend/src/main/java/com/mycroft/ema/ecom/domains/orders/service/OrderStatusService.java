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
import java.util.Map;
import java.util.UUID;

@Service
public class OrderStatusService {

  private final OrderStatusRepository repository;
  private final JdbcTemplate jdbcTemplate;
  private final List<BaseStatus> baseStatuses;

  public OrderStatusService(OrderStatusRepository repository, JdbcTemplate jdbcTemplate) {
    this.repository = repository;
    this.jdbcTemplate = jdbcTemplate;
    this.baseStatuses = List.of(
        new BaseStatus("new", "New", "New", 1),
        new BaseStatus("pending_confirmation", "En cours de confirmation", "Pending Confirmation", 2),
        new BaseStatus("confirmer", "Confirmer", "Confirm", 3),
        new BaseStatus("envoyer", "Envoyer", "Shipped", 4),
        new BaseStatus("livrer", "Livrer", "Deliver", 5),
        new BaseStatus("reporter", "Reporter", "Reschedule", 6),
        new BaseStatus("annuler", "Annuler", "Cancel", 7),
        new BaseStatus("retour", "Retour", "Return", 8),
        new BaseStatus("nrp", "NRP", "NRP", 9),
        new BaseStatus("nrp_3", "NRP 3", "NRP 3", 10),
        new BaseStatus("nrp_2", "NRP 2", "NRP 2", 11),
        new BaseStatus("saisie", "Saisie", "Entry", 12),
        new BaseStatus("double", "Double", "Duplicate", 13),
        new BaseStatus("whatsapp", "Whatsapp", "Whatsapp", 14),
        new BaseStatus("erreur_numero", "Erreur Numero", "Wrong Number", 15)
    );
    ensureBaseStatuses();
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
    if (isBaseStatus(existing.getName())) {
      throw new BadRequestException("order-status.locked");
    }
    existing.setLabelEn(request.labelEn().trim());
    existing.setLabelFr(request.labelFr().trim());
    existing.setDisplayOrder(normalizeOrder(request.displayOrder()));
    return toDto(repository.save(existing));
  }

  @Transactional
  public void delete(UUID id) {
    OrderStatus status = repository.findById(id)
        .orElseThrow(() -> new BadRequestException("order-status.notFound"));
    if (isBaseStatus(status.getName())) {
      throw new BadRequestException("order-status.locked");
    }
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

  private void ensureBaseStatuses() {
    for (BaseStatus base : baseStatuses) {
      repository.findByNameIgnoreCase(base.code()).ifPresentOrElse(
          existing -> {
            boolean changed = false;
            if (!base.labelEn().equals(existing.getLabelEn())) {
              existing.setLabelEn(base.labelEn());
              changed = true;
            }
            if (!base.labelFr().equals(existing.getLabelFr())) {
              existing.setLabelFr(base.labelFr());
              changed = true;
            }
            if (!base.displayOrder().equals(existing.getDisplayOrder())) {
              existing.setDisplayOrder(base.displayOrder());
              changed = true;
            }
            if (changed) {
              repository.save(existing);
            }
          },
          () -> {
            OrderStatus status = new OrderStatus();
            status.setName(base.code());
            status.setLabelEn(base.labelEn());
            status.setLabelFr(base.labelFr());
            status.setDisplayOrder(base.displayOrder());
            repository.save(status);
          }
      );
    }
    cleanupDeprecatedStatuses();
  }

  private boolean isBaseStatus(String code) {
    if (!StringUtils.hasText(code)) {
      return false;
    }
    String normalized = code.trim().toLowerCase(Locale.ROOT);
    return baseStatuses.stream().anyMatch(bs -> bs.code().equalsIgnoreCase(normalized));
  }

  private record BaseStatus(String code, String labelFr, String labelEn, Integer displayOrder) {}

  private void cleanupDeprecatedStatuses() {
    Map<String, String> replacements = Map.of(
        "shipped", "envoyer",
        "delivered", "livrer",
        "returned", "retour",
        "canceled", "annuler",
        "confirmed", "confirmer"
    );

    replacements.forEach((legacy, canonical) -> {
      try {
        jdbcTemplate.update(
            "update orders_config set status = ? where lower(status) = ?",
            canonical,
            legacy
        );
      } catch (Exception ignored) {
        // best-effort cleanup; do not block service startup
      }

      repository.findByNameIgnoreCase(legacy).ifPresent(status -> {
        if (!isStatusInUse(legacy)) {
          repository.delete(status);
        }
      });
    });

    cleanupDuplicatePendingConfirmation();
  }

  private void cleanupDuplicatePendingConfirmation() {
    try {
      List<String> duplicates = jdbcTemplate.queryForList(
          """
              select lower(name) as name
              from order_status
              where lower(name) <> 'pending_confirmation'
                and (
                  lower(label_en) = 'pending confirmation'
                  or lower(label_fr) = 'pending confirmation'
                  or lower(name) = 'pending confirmation'
                )
              """,
          String.class
      );
      for (String dup : duplicates) {
        try {
          jdbcTemplate.update(
              "update orders_config set status = 'pending_confirmation' where lower(status) = ?",
              dup
          );
        } catch (Exception ignored) {
          // ignore; best effort
        }
        repository.findByNameIgnoreCase(dup).ifPresent(status -> {
          if (!isBaseStatus(status.getName())) {
            repository.delete(status);
          }
        });
      }
    } catch (Exception ignored) {
      // ignore; best effort
    }
  }
}
