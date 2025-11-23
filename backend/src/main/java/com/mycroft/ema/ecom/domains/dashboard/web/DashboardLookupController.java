package com.mycroft.ema.ecom.domains.dashboard.web;

import com.mycroft.ema.ecom.auth.domain.Role;
import com.mycroft.ema.ecom.auth.domain.User;
import com.mycroft.ema.ecom.auth.repo.UserRepository;
import com.mycroft.ema.ecom.domains.dashboard.dto.ProductLookupDto;
import com.mycroft.ema.ecom.domains.dashboard.dto.UserLookupDto;
import com.mycroft.ema.ecom.domains.imports.service.DomainImportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/dashboard/lookups")
@Tag(name = "Dashboard Lookups", description = "Helper endpoints for dashboard filters")
public class DashboardLookupController {

  private static final String MEDIA_BUYER_ROLE = "MEDIA_BUYER";
  private static final String CONFIRMATION_AGENT_ROLE = "CONFIRMATION_AGENT";

  private final UserRepository userRepository;
  private final DomainImportService domainImportService;
  private final JdbcTemplate jdbcTemplate;

  public DashboardLookupController(UserRepository userRepository,
                                   DomainImportService domainImportService,
                                   JdbcTemplate jdbcTemplate) {
    this.userRepository = userRepository;
    this.domainImportService = domainImportService;
    this.jdbcTemplate = jdbcTemplate;
  }

  @GetMapping("/agents")
  @PreAuthorize("hasAuthority('dashboard:view')")
  @Operation(summary = "List confirmation agents for dashboard filters")
  public List<UserLookupDto> confirmationAgents() {
    return usersByRole(CONFIRMATION_AGENT_ROLE);
  }

  @GetMapping("/media-buyers")
  @PreAuthorize("hasAuthority('dashboard:view')")
  @Operation(summary = "List media buyers for dashboard filters")
  public List<UserLookupDto> mediaBuyers() {
    return usersByRole(MEDIA_BUYER_ROLE);
  }

  @GetMapping("/products")
  @PreAuthorize("hasAuthority('dashboard:view')")
  @Operation(summary = "List products for dashboard filters")
  public List<ProductLookupDto> products() {
    String table;
    try {
      table = domainImportService.tableForDomain("products");
    } catch (Exception ex) {
      return List.of();
    }
    try {
      return jdbcTemplate.query(
          "select id, product_name from " + table + " where product_name is not null order by product_name asc",
          (rs, rowNum) -> new ProductLookupDto(
              rs.getObject("id", java.util.UUID.class),
              rs.getString("product_name")))
          .stream()
          .filter(dto -> StringUtils.hasText(dto.name()))
          .collect(Collectors.toList());
    } catch (Exception ex) {
      return List.of();
    }
  }

  private List<UserLookupDto> usersByRole(String roleName) {
    if (!StringUtils.hasText(roleName)) {
      return List.of();
    }
    String normalizedRole = roleName.trim().toLowerCase(Locale.ROOT);
    return userRepository.findAll().stream()
        .filter(User::isEnabled)
        .filter(user -> hasRole(user, normalizedRole))
        .map(user -> new UserLookupDto(user.getId(), user.getUsername(), user.getEmail()))
        .sorted(Comparator.comparing(UserLookupDto::username, String.CASE_INSENSITIVE_ORDER))
        .toList();
  }

  private boolean hasRole(User user, String normalizedRole) {
    if (user == null || user.getRoles() == null) {
      return false;
    }
    for (Role role : user.getRoles()) {
      if (role == null || role.getName() == null) {
        continue;
      }
      String name = role.getName().trim().toLowerCase(Locale.ROOT);
      if (name.equals(normalizedRole)) {
        return true;
      }
    }
    return false;
  }
}
