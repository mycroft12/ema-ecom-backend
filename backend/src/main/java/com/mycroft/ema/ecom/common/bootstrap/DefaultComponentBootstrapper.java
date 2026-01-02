package com.mycroft.ema.ecom.common.bootstrap;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mycroft.ema.ecom.domains.imports.dto.ColumnInfo;
import com.mycroft.ema.ecom.domains.imports.service.DomainImportService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * Application runner that seeds default domain components, configures column metadata and inserts sample records when needed.
 */
@Component
public class DefaultComponentBootstrapper implements ApplicationRunner {

  private static final Logger log = LoggerFactory.getLogger(DefaultComponentBootstrapper.class);

  private final DomainImportService domainImportService;
  private final JdbcTemplate jdbcTemplate;
  private final ObjectMapper objectMapper;
  private final ResourceLoader resourceLoader;
  private final List<Map<String, String>> cachedCityOptions;

  public DefaultComponentBootstrapper(DomainImportService domainImportService,
                                      JdbcTemplate jdbcTemplate,
                                      ObjectMapper objectMapper,
                                      ResourceLoader resourceLoader) {
    this.domainImportService = domainImportService;
    this.jdbcTemplate = jdbcTemplate;
    this.objectMapper = objectMapper;
    this.resourceLoader = resourceLoader;
    this.cachedCityOptions = loadCityOptions();
  }

  @Override
  public void run(ApplicationArguments args) {
    initializeProducts();
    initializeOrders();
    initializeAds();
    domainImportService.assignAllPermissionsToAdmin();
  }

  private void initializeProducts() {
    List<ColumnInfo> columns = new ArrayList<>();
    ColumnInfo image = column("Product Image", "product_image", "MINIO_IMAGE", "TEXT", true);
    image.setSemanticType("MINIO:IMAGE");
    Map<String, Object> metadata = new HashMap<>();
    metadata.put("maxImages", 1);
    metadata.put("maxFileSizeBytes", 5 * 1024 * 1024);
    metadata.put("allowedMimeTypes", List.of("image/jpeg", "image/png", "image/webp", "image/gif"));
    image.setMetadata(metadata);
    columns.add(image);

    columns.add(column("Product Name", "product_name", "TEXT", "VARCHAR(255)", true));
    columns.add(column("Product Variant", "product_variant", "TEXT", "VARCHAR(255)", true));
    columns.add(column("Product Link", "product_link", "TEXT", "TEXT", true));
    columns.add(column("SKU", "sku", "TEXT", "VARCHAR(100)", true));
    columns.add(column("Selling Price", "selling_price", "DECIMAL", "NUMERIC(12,2)", true));
    columns.add(column("Available Stock", "available_stock", "INTEGER", "BIGINT", true));
    columns.add(column("Cost of Goods", "cost_of_goods", "DECIMAL", "NUMERIC(12,2)", true));
    columns.add(column("Low Stock Threshold", "low_stock_threshold", "INTEGER", "BIGINT", true));

    try {
      boolean created = domainImportService.ensureDefaultComponent("product", columns);
      if (created) {
        log.info("Default product component initialized");
      }
    } catch (Exception ex) {
      log.warn("Failed to bootstrap default product component: {}", ex.getMessage());
    }
    domainImportService.cleanupLegacyPermissions("product");
    seedProductsSample();
  }

  private void initializeOrders() {
    List<ColumnInfo> columns = new ArrayList<>();
    ColumnInfo orderNumber = column("Order Number", "order_number", "INTEGER", "BIGSERIAL", false);
    orderNumber.getMetadata().put("readOnly", true);
    orderNumber.getMetadata().put("hintKey", "orders.form.orderNumberHint");
    orderNumber.setSemanticType("SYSTEM:ORDER_NUMBER");
    columns.add(orderNumber);
    columns.add(column("Order Reference", "order_reference", "TEXT", "VARCHAR(64)", true));
    columns.add(column("Customer Name", "customer_name", "TEXT", "VARCHAR(255)", true));
    columns.add(column("Customer Phone", "customer_phone", "TEXT", "VARCHAR(32)", true));
    columns.add(column("Status", "status", "TEXT", "VARCHAR(32)", true));
    columns.add(column("Assigned Agent", "assigned_agent", "TEXT", "VARCHAR(255)", true));
    columns.add(column("Store Name", "store_name", "TEXT", "VARCHAR(255)", true));
    columns.add(column("Upsell", "upsell", "BOOLEAN", "BOOLEAN", true));
    ColumnInfo cityConfirmed = column("City Confirmed", "city_confirmed", "TEXT", "VARCHAR(128)", true);
    if (!cachedCityOptions.isEmpty()) {
      cityConfirmed.getMetadata().put("options", cachedCityOptions);
      cityConfirmed.getMetadata().put("input", "select");
    }
    cityConfirmed.setSemanticType("REFERENCE:CITY");
    columns.add(cityConfirmed);
    columns.add(column("Total Price", "total_price", "DECIMAL", "NUMERIC(12,2)", true));
    columns.add(column("Created At", "created_at", "DATE", "TIMESTAMP", true));
    columns.add(column("Product Summary", "product_summary", "TEXT", "TEXT", true));
    columns.add(column("Notes", "notes", "TEXT", "TEXT", true));

    try {
      boolean created = domainImportService.ensureDefaultComponent("orders", columns);
      if (created) {
        log.info("Default orders component initialized");
      }
    } catch (Exception ex) {
      log.warn("Failed to bootstrap default orders component: {}", ex.getMessage());
    }
    domainImportService.cleanupLegacyPermissions("orders");
    seedOrdersSample();
  }

  private void initializeAds() {
    List<ColumnInfo> columns = new ArrayList<>();
    columns.add(column("Spend Date", "spend_date", "DATE", "DATE", true));
    columns.add(column("Product Reference", "product_reference", "TEXT", "VARCHAR(128)", true));
    columns.add(column("Platform", "platform", "TEXT", "VARCHAR(64)", true));
    columns.add(column("AD Account Name", "campaign_name", "TEXT", "VARCHAR(255)", true));
    columns.add(column("Ad Spend ($)", "ad_spend", "DECIMAL", "NUMERIC(12,2)", false));
    columns.add(column("Leads", "confirmed_orders", "INTEGER", "BIGINT", true));
    ColumnInfo cpl = column("CPL", "cpl", "DECIMAL", "NUMERIC(12,2)", true);
    cpl.getMetadata().put("readOnly", true);
    cpl.getMetadata().put("disabled", true);
    cpl.getMetadata().put("scale", 2);
    columns.add(cpl);
    columns.add(column("Notes", "notes", "TEXT", "TEXT", true));

    try {
      boolean created = domainImportService.ensureDefaultComponent("ads", columns);
      if (created) {
        log.info("Default advertising component initialized");
      }
    } catch (Exception ex) {
      log.warn("Failed to bootstrap default advertising component: {}", ex.getMessage());
    }
    domainImportService.cleanupLegacyPermissions("ads");
    seedAdsSample();
  }

  private ColumnInfo column(String excelName, String name, String inferredType, String sqlType, boolean nullable) {
    ColumnInfo info = new ColumnInfo(excelName, name, inferredType, sqlType, nullable, null);
    info.setMetadata(new HashMap<>());
    return info;
  }

  private boolean tableHasRows(String table) {
    try {
      Integer count = jdbcTemplate.queryForObject("select count(*) from " + table, Integer.class);
      return count != null && count > 0;
    } catch (Exception ex) {
      return false;
    }
  }

  private boolean tableHasAllColumns(String table, List<String> expectedColumns) {
    try {
      List<String> cols = jdbcTemplate.queryForList(
          "select column_name from information_schema.columns where table_schema = current_schema() and table_name = ?",
          String.class,
          table
      );
      var set = new java.util.HashSet<>(cols.stream().map(c -> c == null ? "" : c.toLowerCase()).toList());
      for (String col : expectedColumns) {
        if (!set.contains(col.toLowerCase())) {
          return false;
        }
      }
      return true;
    } catch (Exception ex) {
      return false;
    }
  }

  private void seedProductsSample() {
    if (tableHasRows("product_config")) {
      return;
    }
    jdbcTemplate.update("insert into product_config (id, product_image, product_name, product_variant, product_link, sku, selling_price, available_stock, cost_of_goods, low_stock_threshold) " +
        "values (gen_random_uuid(), ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        null,
        "Starter Pack",
        "Standard",
        "https://example.com/products/starter-pack",
        "SKU-001",
        new BigDecimal("49.99"),
        150L,
        new BigDecimal("22.50"),
        25L);
  }

  private void seedOrdersSample() {
    if (tableHasRows("orders_config")) {
      return;
    }
    List<String> required = List.of(
        "order_reference", "customer_name", "customer_phone", "status",
        "total_price", "created_at", "product_summary", "notes", "store_name", "city_confirmed", "upsell"
    );
    if (!tableHasAllColumns("orders_config", required)) {
      log.warn("Skipping orders sample seed: orders_config schema does not contain legacy sample columns.");
      return;
    }
    try {
      jdbcTemplate.update("insert into orders_config (id, order_reference, customer_name, customer_phone, status, total_price, created_at, product_summary, notes, store_name, city_confirmed, upsell) " +
          "values (gen_random_uuid(), ?, ?, ?, ?, ?, now(), ?, ?, ?, ?, ?)",
          "ORD-1001", "John Smith", "+33 6 12 34 56 78", "Pending Confirmation", new BigDecimal("89.90"),
          "2 x Starter Pack", "Call customer tomorrow morning", "Downtown Store", "Casablanca", false);
    } catch (Exception ex) {
      log.warn("Skipping orders sample seed due to insert failure: {}", ex.getMessage());
    }
  }

  private void seedAdsSample() {
    if (tableHasRows("ads_config")) {
      return;
    }
    BigDecimal adSpend = new BigDecimal("35.00");
    long leads = 8L;
    BigDecimal cplValue = leads > 0 ? adSpend.divide(BigDecimal.valueOf(leads), 2, java.math.RoundingMode.HALF_UP) : null;
    jdbcTemplate.update("insert into ads_config (id, spend_date, product_reference, platform, campaign_name, ad_spend, confirmed_orders, cpl, notes) " +
        "values (gen_random_uuid(), ?, ?, ?, ?, ?, ?, ?, ?)",
        LocalDate.now(), "SKU-001", "Meta Ads", "Spring Promo", adSpend, leads, cplValue, "Good traction, monitor CPC");
  }

  private List<Map<String, String>> loadCityOptions() {
    Resource resource = resourceLoader.getResource("classpath:cities.json");
    if (!resource.exists()) {
      log.warn("Could not locate cities.json; City Confirmed options will be empty.");
      return List.of();
    }
    try (InputStream is = resource.getInputStream()) {
      JsonNode root = objectMapper.readTree(is);
      if (root == null || !root.isArray()) {
        return List.of();
      }
      List<Map<String, String>> options = new ArrayList<>();
      for (JsonNode node : root) {
        String city = node.path("city").asText(null);
        if (city != null && !city.trim().isEmpty()) {
          String normalized = city.trim();
          options.add(Map.of("label", normalized, "value", normalized));
        }
      }
      return Collections.unmodifiableList(options);
    } catch (IOException ex) {
      log.warn("Failed to read cities.json: {}", ex.getMessage());
      return List.of();
    }
  }
}
