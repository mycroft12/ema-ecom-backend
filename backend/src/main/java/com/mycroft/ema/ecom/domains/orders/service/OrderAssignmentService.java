package com.mycroft.ema.ecom.domains.orders.service;

import com.mycroft.ema.ecom.auth.domain.Role;
import com.mycroft.ema.ecom.auth.domain.User;
import com.mycroft.ema.ecom.auth.repo.UserRepository;
import com.mycroft.ema.ecom.auth.service.CurrentUserService;
import com.mycroft.ema.ecom.common.error.BadRequestException;
import com.mycroft.ema.ecom.domains.hybrid.dto.HybridUpdateDto;
import com.mycroft.ema.ecom.domains.hybrid.dto.HybridViewDto;
import com.mycroft.ema.ecom.domains.hybrid.service.HybridEntityService;
import com.mycroft.ema.ecom.domains.imports.service.DomainImportService;
import com.mycroft.ema.ecom.domains.orders.dto.AgentOrderStatusDto;
import com.mycroft.ema.ecom.domains.orders.dto.OrderAgentDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.*;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.stream.Collectors;

@Service
public class OrderAssignmentService {

  private static final Logger log = LoggerFactory.getLogger(OrderAssignmentService.class);
  private static final String AGENT_ROLE = "CONFIRMATION_AGENT";
  private static final String NEW_STATUS = "new";

  private final UserRepository userRepository;
  private final HybridEntityService hybridEntityService;
  private final JdbcTemplate jdbcTemplate;
  private final DomainImportService domainImportService;
  private final CurrentUserService currentUserService;
  private final AtomicBoolean assignmentColumnsEnsured = new AtomicBoolean(false);

  public OrderAssignmentService(UserRepository userRepository,
                                HybridEntityService hybridEntityService,
                                JdbcTemplate jdbcTemplate,
                                DomainImportService domainImportService,
                                CurrentUserService currentUserService) {
    this.userRepository = userRepository;
    this.hybridEntityService = hybridEntityService;
    this.jdbcTemplate = jdbcTemplate;
    this.domainImportService = domainImportService;
    this.currentUserService = currentUserService;
  }

  public List<OrderAgentDto> listAgents() {
    return userRepository.findAll().stream()
        .filter(this::isAssignableAgent)
        .map(user -> new OrderAgentDto(user.getId(), user.getUsername(), user.getEmail()))
        .sorted(Comparator.comparing(OrderAgentDto::username, String.CASE_INSENSITIVE_ORDER))
        .toList();
  }

  public HybridViewDto assignAgent(UUID orderId, UUID agentId) {
    ensureAssignmentColumns();
    User agent = userRepository.findById(agentId)
        .filter(this::isAssignableAgent)
        .orElseThrow(() -> new BadRequestException("orders.assignment.invalidAgent"));
    String identifier = resolveAgentIdentifier(agent);
    if (!StringUtils.hasText(identifier)) {
      throw new BadRequestException("orders.assignment.invalidAgent");
    }
    Map<String, Object> attributes = new HashMap<>();
    attributes.put("assigned_agent", identifier);
    return hybridEntityService.update("orders", orderId, new HybridUpdateDto(attributes));
  }

  public AgentOrderStatusDto currentAgentStatus() {
    ensureAssignmentColumns();
    User agent = currentUserService.getCurrentUser()
        .filter(this::isAssignableAgent)
        .orElseThrow(() -> new BadRequestException("orders.assignment.notAgent"));
    String identifier = resolveAgentIdentifier(agent);
    if (!StringUtils.hasText(identifier)) {
      throw new BadRequestException("orders.assignment.invalidAgent");
    }
    long newOrders = countNewOrders(identifier);
    return new AgentOrderStatusDto(newOrders, newOrders > 0);
  }

  @Transactional
  public HybridViewDto claimNextAvailableOrder() {
    ensureAssignmentColumns();
    User agent = currentUserService.getCurrentUser()
        .filter(this::isAssignableAgent)
        .orElseThrow(() -> new BadRequestException("orders.assignment.notAgent"));
    String identifier = resolveAgentIdentifier(agent);
    if (!StringUtils.hasText(identifier)) {
      throw new BadRequestException("orders.assignment.invalidAgent");
    }
    long newOrders = countNewOrders(identifier);
    if (newOrders > 0) {
      throw new BadRequestException("orders.assignment.activeOrders");
    }
    UUID orderId = findFirstAvailableOrder()
        .orElseThrow(() -> new BadRequestException("orders.assignment.noAvailable"));
    if (!claimOrder(orderId, identifier)) {
      throw new BadRequestException("orders.assignment.claimConflict");
    }
    return hybridEntityService.get("orders", orderId);
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

  private long countNewOrders(String agentIdentifier) {
    if (!StringUtils.hasText(agentIdentifier)) {
      return 0;
    }
    List<Object> args = new ArrayList<>();
    args.add(agentIdentifier.trim().toLowerCase(Locale.ROOT));
    String sql = """
        select count(*) from %s
         where lower(coalesce(trim(assigned_agent), '')) = ?
           and coalesce(lower(trim(status)), '') = ?
        """.formatted(ordersTable());
    args.add(NEW_STATUS);
    Long count = jdbcTemplate.queryForObject(sql, Long.class, args.toArray());
    return count == null ? 0L : count;
  }

  private Optional<UUID> findFirstAvailableOrder() {
    List<Object> args = new ArrayList<>();
    args.add(NEW_STATUS);
    String table = ordersTable();
    String sql = """
        select id from %s
         where (assigned_agent is null or trim(assigned_agent) = '')
           and coalesce(lower(trim(status)), '') = ?
         order by random()
         limit 1
        """.formatted(table);
    try {
      UUID id = jdbcTemplate.queryForObject(sql, UUID.class, args.toArray());
      return Optional.ofNullable(id);
    } catch (Exception ex) {
      return Optional.empty();
    }
  }

  private boolean claimOrder(UUID orderId, String agentIdentifier) {
    List<Object> args = new ArrayList<>();
    args.add(agentIdentifier == null ? null : agentIdentifier.trim());
    args.add(orderId);
    args.add(NEW_STATUS);
    String sql = """
        update %s set assigned_agent = ?
         where id = ?
           and (assigned_agent is null or trim(assigned_agent) = '')
           and coalesce(lower(trim(status)), '') = ?
        """.formatted(ordersTable());
    int updated = jdbcTemplate.update(sql, args.toArray());
    return updated > 0;
  }

  private String resolveAgentIdentifier(User agent) {
    if (agent == null) {
      return null;
    }
    String username = agent.getUsername();
    if (StringUtils.hasText(username)) {
      return username.trim();
    }
    String email = agent.getEmail();
    if (StringUtils.hasText(email)) {
      return email.trim();
    }
    return null;
  }

  private String ordersTable() {
    return domainImportService.tableForDomain("orders");
  }

  private void ensureAssignmentColumns() {
    if (assignmentColumnsEnsured.get()) {
      return;
    }
    synchronized (assignmentColumnsEnsured) {
      if (assignmentColumnsEnsured.get()) {
        return;
      }
      try {
        domainImportService.ensureOrderAssignmentColumns();
        assignmentColumnsEnsured.set(true);
      } catch (Exception ex) {
        log.warn("Failed to ensure assignment columns are present: {}", ex.getMessage());
      }
    }
  }

  private String placeholders(int count) {
    if (count <= 0) {
      return "?";
    }
    return String.join(",", Collections.nCopies(count, "?"));
  }
}
