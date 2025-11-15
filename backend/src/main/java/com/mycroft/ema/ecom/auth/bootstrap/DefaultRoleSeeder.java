package com.mycroft.ema.ecom.auth.bootstrap;

import com.mycroft.ema.ecom.auth.domain.Permission;
import com.mycroft.ema.ecom.auth.domain.Role;
import com.mycroft.ema.ecom.auth.repo.RoleRepository;
import com.mycroft.ema.ecom.auth.service.PermissionService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Seeds opinionated default roles so that a freshly installed platform already exposes the key personas.
 * The seeder only creates roles that do not exist yet, allowing administrators to customize later on.
 */
@Component
@Order(150)
public class DefaultRoleSeeder implements ApplicationRunner {

  private static final Logger log = LoggerFactory.getLogger(DefaultRoleSeeder.class);

  private record RoleDefinition(String name, List<String> permissions) {}

  private static final RoleDefinition SUPERVISOR_ROLE = new RoleDefinition(
      "SUPERVISOR",
      List.of(
          "orders:read",
          "orders:update",
          "orders:export:excel",
          "orders:access:order_reference",
          "orders:access:customer_name",
          "orders:access:customer_phone",
          "orders:access:status",
          "orders:access:assigned_agent",
          "orders:access:total_price",
          "orders:access:created_at",
          "orders:access:product_summary",
          "orders:access:notes",
          "product:read",
          "product:access:product_name",
          "product:access:sku",
          "product:access:selling_price",
          "product:access:available_stock",
          "product:access:low_stock_threshold",
          "product:access:product_image",
          "expenses:read",
          "expenses:export:excel",
          "ads:read"
      )
  );

  private static final RoleDefinition CONFIRMATION_AGENT_ROLE = new RoleDefinition(
      "CONFIRMATION_AGENT",
      List.of(
          "orders:read",
          "orders:update",
          "orders:access:order_reference",
          "orders:access:customer_name",
          "orders:access:customer_phone",
          "orders:access:status",
          "orders:access:assigned_agent",
          "orders:access:total_price",
          "orders:access:created_at",
          "orders:access:product_summary",
          "orders:access:notes"
      )
  );

  private static final RoleDefinition MEDIA_BUYER_ROLE = new RoleDefinition(
      "MEDIA_BUYER",
      List.of(
          "product:read",
          "product:access:product_name",
          "product:access:sku",
          "product:access:selling_price",
          "product:access:available_stock",
          "product:access:low_stock_threshold",
          "product:access:product_image",
          "ads:read",
          "ads:create",
          "ads:update",
          "ads:export:excel",
          "ads:access:spend_date",
          "ads:access:product_reference",
          "ads:access:platform",
          "ads:access:campaign_name",
          "ads:access:ad_spend",
          "ads:access:confirmed_orders",
          "ads:access:delivered_orders",
          "ads:access:notes",
          "orders:read",
          "orders:access:order_reference",
          "orders:access:status",
          "orders:access:product_summary",
          "orders:access:total_price"
      )
  );

  private static final List<RoleDefinition> ROLE_DEFINITIONS = List.of(
      SUPERVISOR_ROLE,
      CONFIRMATION_AGENT_ROLE,
      MEDIA_BUYER_ROLE
  );

  private final RoleRepository roleRepository;
  private final PermissionService permissionService;

  public DefaultRoleSeeder(RoleRepository roleRepository, PermissionService permissionService) {
    this.roleRepository = roleRepository;
    this.permissionService = permissionService;
  }

  @Override
  @Transactional
  public void run(ApplicationArguments args) {
    ROLE_DEFINITIONS.forEach(this::seedRoleIfMissing);
  }

  private void seedRoleIfMissing(RoleDefinition definition) {
    roleRepository.findByName(definition.name()).ifPresentOrElse(
        role -> log.debug("Role '{}' already exists. Skipping default seeding.", definition.name()),
        () -> {
          Role role = new Role();
          role.setName(definition.name());
          Set<Permission> permissions = definition.permissions().stream()
              .map(permissionService::ensure)
              .collect(Collectors.toCollection(LinkedHashSet::new));
          role.setPermissions(permissions);
          roleRepository.save(role);
          log.info("Seeded default role '{}' with {} permissions", definition.name(), permissions.size());
        }
    );
  }
}
