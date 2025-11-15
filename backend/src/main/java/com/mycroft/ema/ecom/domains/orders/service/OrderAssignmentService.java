package com.mycroft.ema.ecom.domains.orders.service;

import com.mycroft.ema.ecom.auth.domain.Role;
import com.mycroft.ema.ecom.auth.domain.User;
import com.mycroft.ema.ecom.auth.repo.UserRepository;
import com.mycroft.ema.ecom.common.error.BadRequestException;
import com.mycroft.ema.ecom.domains.hybrid.dto.HybridUpdateDto;
import com.mycroft.ema.ecom.domains.hybrid.dto.HybridViewDto;
import com.mycroft.ema.ecom.domains.hybrid.service.HybridEntityService;
import com.mycroft.ema.ecom.domains.orders.dto.OrderAgentDto;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class OrderAssignmentService {

  private static final String AGENT_ROLE = "CONFIRMATION_AGENT";

  private final UserRepository userRepository;
  private final HybridEntityService hybridEntityService;

  public OrderAssignmentService(UserRepository userRepository,
                                HybridEntityService hybridEntityService) {
    this.userRepository = userRepository;
    this.hybridEntityService = hybridEntityService;
  }

  public List<OrderAgentDto> listAgents() {
    return userRepository.findAll().stream()
        .filter(this::isAssignableAgent)
        .map(user -> new OrderAgentDto(user.getId(), user.getUsername(), user.getEmail()))
        .sorted(Comparator.comparing(OrderAgentDto::username, String.CASE_INSENSITIVE_ORDER))
        .toList();
  }

  public HybridViewDto assignAgent(UUID orderId, UUID agentId) {
    User agent = userRepository.findById(agentId)
        .filter(this::isAssignableAgent)
        .orElseThrow(() -> new BadRequestException("orders.assignment.invalidAgent"));
    Map<String, Object> attributes = new HashMap<>();
    attributes.put("assigned_agent", agent.getUsername());
    return hybridEntityService.update("orders", orderId, new HybridUpdateDto(attributes));
  }

  private boolean isAssignableAgent(User user) {
    if (user == null || !user.isEnabled()) {
      return false;
    }
    return Optional.ofNullable(user.getRoles())
        .stream()
        .flatMap(Set::stream)
        .map(Role::getName)
        .filter(Objects::nonNull)
        .map(name -> name.trim().toLowerCase(Locale.ROOT))
        .anyMatch(name -> AGENT_ROLE.toLowerCase(Locale.ROOT).equals(name));
  }
}
