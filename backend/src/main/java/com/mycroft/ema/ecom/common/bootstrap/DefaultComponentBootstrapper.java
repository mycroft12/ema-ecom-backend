package com.mycroft.ema.ecom.common.bootstrap;

import com.mycroft.ema.ecom.domains.imports.dto.ColumnInfo;
import com.mycroft.ema.ecom.domains.imports.service.DomainImportService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
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

  public DefaultComponentBootstrapper(DomainImportService domainImportService, JdbcTemplate jdbcTemplate) {
    this.domainImportService = domainImportService;
    this.jdbcTemplate = jdbcTemplate;
  }

  @Override
  public void run(ApplicationArguments args) {
    initializeProducts();
    initializeOrders();
    initializeExpenses();
    initializeAds();
    domainImportService.assignAllPermissionsToAdmin();
  }

  private void initializeProducts() {
    List<ColumnInfo> columns = new ArrayList<>();
    columns.add(column("Product Name", "product_name", "TEXT", "VARCHAR(255)", true));
    columns.add(column("SKU", "sku", "TEXT", "VARCHAR(100)", true));
    columns.add(column("Selling Price", "selling_price", "DECIMAL", "NUMERIC(12,2)", true));
    columns.add(column("Available Stock", "available_stock", "INTEGER", "BIGINT", true));
    columns.add(column("Cost of Goods", "cost_of_goods", "DECIMAL", "NUMERIC(12,2)", true));
    columns.add(column("Low Stock Threshold", "low_stock_threshold", "INTEGER", "BIGINT", true));

    ColumnInfo image = column("Product Image", "product_image", "MINIO_IMAGE", "TEXT", true);
    image.setSemanticType("MINIO:IMAGE");
    Map<String, Object> metadata = new HashMap<>();
    metadata.put("maxImages", 1);
    metadata.put("maxFileSizeBytes", 5 * 1024 * 1024);
    metadata.put("allowedMimeTypes", List.of("image/jpeg", "image/png", "image/webp", "image/gif"));
    image.setMetadata(metadata);
    columns.add(image);

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
    columns.add(column("Order Reference", "order_reference", "TEXT", "VARCHAR(64)", true));
    columns.add(column("Customer Name", "customer_name", "TEXT", "VARCHAR(255)", true));
    columns.add(column("Customer Phone", "customer_phone", "TEXT", "VARCHAR(32)", true));
    columns.add(column("Status", "status", "TEXT", "VARCHAR(32)", true));
    columns.add(column("Assigned Agent", "assigned_agent", "TEXT", "VARCHAR(255)", true));
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

  private void initializeExpenses() {
    List<ColumnInfo> columns = new ArrayList<>();
    columns.add(column("Expense Category", "expense_category", "TEXT", "VARCHAR(128)", true));
    columns.add(column("Expense Type", "expense_type", "TEXT", "VARCHAR(128)", true));
    columns.add(column("Amount", "amount", "DECIMAL", "NUMERIC(12,2)", true));
    columns.add(column("Incurred On", "incurred_on", "DATE", "DATE", true));
    columns.add(column("Associated Agent", "associated_agent", "TEXT", "VARCHAR(255)", true));
    columns.add(column("Associated Order", "associated_order_reference", "TEXT", "VARCHAR(64)", true));
    columns.add(column("Notes", "notes", "TEXT", "TEXT", true));

    try {
      boolean created = domainImportService.ensureDefaultComponent("expenses", columns);
      if (created) {
        log.info("Default expenses component initialized");
      }
    } catch (Exception ex) {
      log.warn("Failed to bootstrap default expenses component: {}", ex.getMessage());
    }
    domainImportService.cleanupLegacyPermissions("expenses");
    seedExpensesSample();
  }

  private void initializeAds() {
    List<ColumnInfo> columns = new ArrayList<>();
    columns.add(column("Spend Date", "spend_date", "DATE", "DATE", true));
    columns.add(column("Product Reference", "product_reference", "TEXT", "VARCHAR(128)", true));
    columns.add(column("Platform", "platform", "TEXT", "VARCHAR(64)", true));
    columns.add(column("Campaign Name", "campaign_name", "TEXT", "VARCHAR(255)", true));
    columns.add(column("Ad Spend", "ad_spend", "DECIMAL", "NUMERIC(12,2)", false));
    columns.add(column("Confirmed Orders", "confirmed_orders", "INTEGER", "BIGINT", true));
    columns.add(column("Delivered Orders", "delivered_orders", "INTEGER", "BIGINT", true));
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
    info.setMetadata(Map.of());
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

  private void seedProductsSample() {
    if (tableHasRows("product_config")) {
      return;
    }
    jdbcTemplate.update("insert into product_config (id, product_name, sku, selling_price, available_stock, cost_of_goods, low_stock_threshold, product_image) " +
        "values (gen_random_uuid(), ?, ?, ?, ?, ?, ?, ?)",
        "Starter Pack", "SKU-001", new BigDecimal("49.99"), 150L, new BigDecimal("22.50"), 25L, null);
  }

  private void seedOrdersSample() {
    if (tableHasRows("orders_config")) {
      return;
    }
    jdbcTemplate.update("insert into orders_config (id, order_reference, customer_name, customer_phone, status, assigned_agent, total_price, created_at, product_summary, notes) " +
        "values (gen_random_uuid(), ?, ?, ?, ?, ?, ?, now(), ?, ?)",
        "ORD-1001", "John Smith", "+33 6 12 34 56 78", "Pending Confirmation", "Agent A", new BigDecimal("89.90"),
        "2 x Starter Pack", "Call customer tomorrow morning");
  }

  private void seedExpensesSample() {
    if (tableHasRows("expenses_config")) {
      return;
    }
    jdbcTemplate.update("insert into expenses_config (id, expense_category, expense_type, amount, incurred_on, associated_agent, associated_order_reference, notes) " +
        "values (gen_random_uuid(), ?, ?, ?, ?, ?, ?, ?)",
        "Logistics", "Shipping", new BigDecimal("12.40"), LocalDate.now(), "Agent A", "ORD-1001", "Standard shipping fee");
  }

  private void seedAdsSample() {
    if (tableHasRows("ads_config")) {
      return;
    }
    jdbcTemplate.update("insert into ads_config (id, spend_date, product_reference, platform, campaign_name, ad_spend, confirmed_orders, delivered_orders, notes) " +
        "values (gen_random_uuid(), ?, ?, ?, ?, ?, ?, ?, ?)",
        LocalDate.now(), "SKU-001", "Facebook", "Spring Promo", new BigDecimal("35.00"), 8L, 5L, "Good traction, monitor CPC");
  }
}
