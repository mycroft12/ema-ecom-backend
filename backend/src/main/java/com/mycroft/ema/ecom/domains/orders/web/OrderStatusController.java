package com.mycroft.ema.ecom.domains.orders.web;

import com.mycroft.ema.ecom.domains.orders.dto.OrderStatusDto;
import com.mycroft.ema.ecom.domains.orders.dto.OrderStatusRequest;
import com.mycroft.ema.ecom.domains.orders.service.OrderStatusService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/orders/statuses")
@Tag(name = "Order Statuses", description = "Manage lifecycle statuses used by orders.")
public class OrderStatusController {

  private final OrderStatusService service;

  public OrderStatusController(OrderStatusService service) {
    this.service = service;
  }

  @GetMapping
  @PreAuthorize("hasAuthority('orders:read')")
  @Operation(summary = "List order statuses")
  public List<OrderStatusDto> list() {
    return service.list();
  }

  @PostMapping
  @PreAuthorize("hasAuthority('orders:update')")
  @Operation(summary = "Create order status")
  public OrderStatusDto create(@Valid @RequestBody OrderStatusRequest request) {
    return service.create(request);
  }

  @PutMapping("/{id}")
  @PreAuthorize("hasAuthority('orders:update')")
  @Operation(summary = "Update order status")
  public OrderStatusDto update(@PathVariable UUID id, @Valid @RequestBody OrderStatusRequest request) {
    return service.update(id, request);
  }

  @DeleteMapping("/{id}")
  @PreAuthorize("hasAuthority('orders:update')")
  @Operation(summary = "Delete order status")
  public void delete(@PathVariable UUID id) {
    service.delete(id);
  }
}
