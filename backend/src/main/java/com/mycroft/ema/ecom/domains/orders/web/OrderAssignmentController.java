package com.mycroft.ema.ecom.domains.orders.web;

import com.mycroft.ema.ecom.domains.hybrid.dto.HybridViewDto;
import com.mycroft.ema.ecom.domains.orders.dto.OrderAgentDto;
import com.mycroft.ema.ecom.domains.orders.dto.OrderAssignmentRequest;
import com.mycroft.ema.ecom.domains.orders.service.OrderAssignmentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/orders")
@Tag(name = "Order Management", description = "Agent assignment and helpers for orders.")
public class OrderAssignmentController {

  private final OrderAssignmentService service;

  public OrderAssignmentController(OrderAssignmentService service) {
    this.service = service;
  }

  @GetMapping("/agents")
  @PreAuthorize("hasAuthority('orders:update')")
  @Operation(summary = "List available confirmation agents")
  public List<OrderAgentDto> agents() {
    return service.listAgents();
  }

  @PostMapping("/{orderId}/assignment")
  @PreAuthorize("hasAuthority('orders:update')")
  @Operation(summary = "Assign an agent to an order")
  public HybridViewDto assign(@PathVariable UUID orderId, @Valid @RequestBody OrderAssignmentRequest request) {
    return service.assignAgent(orderId, request.agentId());
  }
}
