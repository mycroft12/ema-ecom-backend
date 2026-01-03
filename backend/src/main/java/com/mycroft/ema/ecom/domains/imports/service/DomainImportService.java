package com.mycroft.ema.ecom.domains.imports.service;

import com.mycroft.ema.ecom.auth.domain.Permission;
import com.mycroft.ema.ecom.auth.repo.RoleRepository;
import com.mycroft.ema.ecom.auth.service.PermissionService;
import com.mycroft.ema.ecom.common.metadata.ColumnSemanticsService;
import com.mycroft.ema.ecom.domains.imports.dto.ColumnInfo;
import com.mycroft.ema.ecom.domains.imports.dto.DomainPopulationResponse;
import com.mycroft.ema.ecom.domains.imports.dto.TemplateAnalysisResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.sql.Connection;
import java.sql.Statement;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Orchestrates domain configuration from uploaded templates, creating tables, permissions and column semantics.
 */
@Service
public class DomainImportService {
  private static final Logger log = LoggerFactory.getLogger(DomainImportService.class);

  private final ExcelTemplateService templateService;
  private final JdbcTemplate jdbcTemplate;
  private final PermissionService permissionService;
  private final ColumnSemanticsService columnSemanticsService;
  private final RoleRepository roleRepository;

  public DomainImportService(ExcelTemplateService templateService, JdbcTemplate jdbcTemplate,
                             PermissionService permissionService,
                             ColumnSemanticsService columnSemanticsService,
                             RoleRepository roleRepository) {
    this.templateService = templateService;
    this.jdbcTemplate = jdbcTemplate;
    this.permissionService = permissionService;
    this.columnSemanticsService = columnSemanticsService;
    this.roleRepository = roleRepository;
  }

  public TemplateAnalysisResponse configureFromFile(String domain, MultipartFile file) {
    if (file.isEmpty()) {
      throw new IllegalArgumentException("Please upload a non-empty file");
    }
    String filename = file.getOriginalFilename();
    if (filename == null || !(filename.toLowerCase().endsWith(".xlsx")
        || filename.toLowerCase().endsWith(".xls")
        || filename.toLowerCase().endsWith(".csv"))) {
      throw new IllegalArgumentException("Unsupported file format. Please upload an Excel (.xlsx/.xls) or CSV (.csv) file");
    }

    String table = tableForDomain(domain);
    TemplateAnalysisResponse analysis = templateService.analyzeTemplate(file, table);
    analysis.setColumns(appendSystemColumnDefinitions(domain, analysis.getColumns()));
    executeDdl(analysis.getCreateTableSql());
    ensureSystemColumns(domain, table);
    ensureDomainBasePermissions(domain);
    templateService.populateData(file, analysis);
    persistColumnSemantics(domain, table, analysis.getColumns());
    createColumnPermissions(domain, analysis);
    return analysis;
  }

  public DomainPopulationResponse populateFromCsv(String domain, MultipartFile file, boolean replaceExistingRows) {
    String normalizedDomain = (domain == null ? "" : domain.trim().toLowerCase(Locale.ROOT));
    if (normalizedDomain.isEmpty()) {
      throw new IllegalArgumentException("Domain is required");
    }
    if (file == null || file.isEmpty()) {
      throw new IllegalArgumentException("Please upload a non-empty CSV file");
    }
    String filename = Optional.ofNullable(file.getOriginalFilename()).orElse("");
    String contentType = Optional.ofNullable(file.getContentType()).orElse("");
    boolean isCsv = filename.toLowerCase(Locale.ROOT).endsWith(".csv")
        || "text/csv".equalsIgnoreCase(contentType)
        || "application/csv".equalsIgnoreCase(contentType);
    if (!isCsv) {
      throw new IllegalArgumentException("Only CSV files are supported when populating data");
    }

    String table = tableForDomain(domain);
    if (!tableExists(table)) {
      throw new IllegalStateException("The " + normalizedDomain + " component is not configured yet");
    }

    TemplateAnalysisResponse analysis = templateService.analyzeTemplate(file, table);
    analysis.setColumns(appendSystemColumnDefinitions(domain, analysis.getColumns()));
    if (analysis.getColumns() == null || analysis.getColumns().isEmpty()) {
      throw new IllegalArgumentException("Unable to detect any columns in the uploaded CSV file");
    }

    validateColumnAlignment(table, analysis.getColumns());
    if (replaceExistingRows) {
      clearTable(table);
    }

    int inserted = templateService.populateData(file, analysis);
    List<String> warnings = analysis.getWarnings() == null
        ? List.of()
        : List.copyOf(analysis.getWarnings());
    return new DomainPopulationResponse(
        normalizedDomain,
        table,
        inserted,
        replaceExistingRows,
        warnings
    );
  }

  public boolean ensureDefaultComponent(String domain, List<ColumnInfo> columns) {
    String table = tableForDomain(domain);
    if (tableExists(table)) {
      return false;
    }
    columns = appendSystemColumnDefinitions(domain, columns);
    String ddl = buildCreateTable(table, columns);
    executeDdl(ddl);
    TemplateAnalysisResponse analysis = new TemplateAnalysisResponse(table, columns, ddl, List.of(), true);
    ensureDomainBasePermissions(domain);
    persistColumnSemantics(domain, table, columns);
    createColumnPermissions(domain, analysis);
    return true;
  }

  private void persistColumnSemantics(String domain, String table, List<ColumnInfo> columns) {
    if (columns == null || columns.isEmpty()) {
      return;
    }
    for (ColumnInfo column : columns) {
      if (column == null) {
        continue;
      }
      if ("id".equalsIgnoreCase(column.getName())) {
        continue;
      }
      if (column.getSemanticType() == null || column.getSemanticType().isBlank()) {
        continue;
      }
      columnSemanticsService.upsert(domain, table, column.getName(), column.getSemanticType(), column.getMetadata());
    }
  }

  public String tableForDomain(String domain){
    return switch ((domain == null ? "" : domain.trim().toLowerCase(Locale.ROOT))){
      case "product", "products" -> "product_config";
      case "order", "orders" -> "orders_config";
      case "ad", "ads", "advertising", "marketing" -> "ads_config";
      default -> throw new IllegalArgumentException("Unsupported domain: " + domain);
    };
  }

  /**
   * Ensures the orders table has the columns required for agent assignment/claim flows.
   * This is a defensive guard for environments configured with custom templates that omitted these fields.
   */
  public void ensureOrderAssignmentColumns() {
    String table = tableForDomain("orders");
    try {
      ensureSystemColumns("orders", table);
      ensureColumnExists(table, "created_at", "timestamp");
    } catch (Exception ex) {
      log.warn("Failed to enforce assignment columns on '{}': {}", table, ex.getMessage());
    }
  }

  private void ensureDomainBasePermissions(String domain) {
    String normalized = (domain == null ? "" : domain.trim().toLowerCase(Locale.ROOT));
    if (normalized.isEmpty()) {
      return;
    }
    List<String> base = List.of(
        normalized + ":read",
        normalized + ":create",
        normalized + ":update",
        normalized + ":delete",
        normalized + ":export:excel"
    );
    for (String name : base) {
      Permission perm = permissionService.ensure(name);
      assignPermissionToAdmin(perm.getId());
    }
  }

  private boolean tableExists(String table) {
    Boolean exists = jdbcTemplate.queryForObject(
        "select exists (select 1 from information_schema.tables where table_schema = current_schema() and table_name = ?)",
        Boolean.class, table);
    return Boolean.TRUE.equals(exists);
  }

  private void clearTable(String table) {
    try {
      jdbcTemplate.update("DELETE FROM " + table);
    } catch (DataAccessException ex) {
      throw new RuntimeException("Failed to clear data in table '" + table + "': " + ex.getMessage(), ex);
    }
  }

  private void validateColumnAlignment(String table, List<ColumnInfo> uploadedColumns) {
    List<String> expected = describeExistingColumns(table);
    List<String> provided = uploadedColumns.stream()
        .map(ColumnInfo::getName)
        .map(name -> name == null ? "" : name.trim().toLowerCase(Locale.ROOT))
        .collect(Collectors.toList());
    if (!expected.equals(provided)) {
      throw new IllegalArgumentException(
          "Uploaded CSV columns do not match the configured schema. Expected " + expected + " but received " + provided);
    }
  }

  private List<String> describeExistingColumns(String table) {
    return jdbcTemplate.query(
        "select column_name from information_schema.columns where table_schema = current_schema() and table_name = ? order by ordinal_position",
        (rs, rowNum) -> {
          String name = rs.getString("column_name");
          return name == null ? "" : name.trim().toLowerCase(Locale.ROOT);
        },
        table
    );
  }

  private void executeDdl(String ddl) {
    try (Connection conn = jdbcTemplate.getDataSource().getConnection()) {
      conn.setAutoCommit(true);
      try (Statement stmt = conn.createStatement()) {
        stmt.execute(ddl);
      }
    } catch (DataAccessException ex) {
      throw new RuntimeException("Failed to create/update table: " + ex.getMessage(), ex);
    } catch (Exception ex) {
      throw new RuntimeException("Database connection error: " + ex.getMessage(), ex);
    }
  }

  private String buildCreateTable(String table, List<ColumnInfo> cols){
    StringBuilder sb = new StringBuilder();
    sb.append("CREATE TABLE IF NOT EXISTS ").append(table).append(" (\n");
    sb.append("  id UUID PRIMARY KEY DEFAULT gen_random_uuid()");
    if (cols != null) {
      for (ColumnInfo c : cols) {
        if (c == null || "id".equalsIgnoreCase(c.getName())) {
          continue;
        }
        sb.append(",\n  ").append(c.getName()).append(" ").append(c.getSqlType());
        if (!c.isNullable()) {
          sb.append(" NOT NULL");
        }
      }
    }
    sb.append("\n);");
    return sb.toString();
  }

  private void createColumnPermissions(String domain, TemplateAnalysisResponse analysis) {
    String prefix = (domain == null ? "" : domain.trim().toLowerCase(Locale.ROOT));
    if (prefix.isEmpty()) {
      return;
    }
    createActionPermissions(prefix);
    if (analysis.getColumns() == null) {
      return;
    }
    analysis.getColumns().forEach(column -> {
      String columnName = column.getName();
      if (columnName == null || columnName.isBlank()) {
        return;
      }
      if ("id".equalsIgnoreCase(columnName)) {
        return;
      }
      String permissionName = prefix + ":access:" + columnName.toLowerCase(Locale.ROOT);
      var permission = permissionService.ensure(permissionName);
      assignPermissionToAdmin(permission.getId());
    });
    assignAllColumnPermissionsToAdmin(prefix);
  }

  private void createActionPermissions(String prefix) {
    cleanupLegacyActionPermissions(prefix);
    String exportPermissionName = prefix + ":export:excel";
    var permission = permissionService.ensure(exportPermissionName);
    assignPermissionToAdmin(permission.getId());
    assignAllColumnPermissionsToAdmin(prefix);
  }

  private void assignPermissionToAdmin(UUID permissionId) {
    UUID adminRoleId = ensureAdminRole();
    jdbcTemplate.update(
        "INSERT INTO roles_permissions(role_id, permission_id) VALUES (?, ?) " +
            "ON CONFLICT DO NOTHING",
        adminRoleId, permissionId);
  }

  private UUID ensureAdminRole() {
    List<UUID> ids = jdbcTemplate.query(
        "select id from roles where name = 'ADMIN'",
        (rs, rowNum) -> rs.getObject("id", UUID.class));
    if (!ids.isEmpty()) {
      return ids.get(0);
    }
    UUID roleId = UUID.randomUUID();
    jdbcTemplate.update(
        "INSERT INTO roles(id, name) VALUES (?, ?) ON CONFLICT (name) DO NOTHING",
        roleId, "ADMIN");
    return jdbcTemplate.queryForObject(
        "select id from roles where name = 'ADMIN'",
        UUID.class);
  }

  public void cleanupLegacyPermissions(String domain) {
    String prefix = (domain == null ? "" : domain.trim().toLowerCase(Locale.ROOT));
    if (prefix.isEmpty()) {
      return;
    }
    cleanupLegacyActionPermissions(prefix);
  }

  private void cleanupLegacyActionPermissions(String prefix) {
    List<String> legacyNames = List.of(
        prefix + ":action:add",
        prefix + ":action:update",
        prefix + ":action:delete",
        prefix + ":action:export:excel",
        prefix + ":action:export"
    );
    for (String legacy : legacyNames) {
      String lowered = legacy.toLowerCase(Locale.ROOT);
      List<UUID> ids = jdbcTemplate.query(
          "select id from permissions where lower(name) = ?",
          (rs, rowNum) -> rs.getObject("id", UUID.class),
          lowered
      );
      for (UUID id : ids) {
        jdbcTemplate.update("delete from roles_permissions where permission_id = ?", id);
        jdbcTemplate.update("delete from permissions where id = ?", id);
      }
    }
  }

  private void assignAllColumnPermissionsToAdmin(String prefix) {
    UUID adminRoleId = ensureAdminRole();
    String pattern = (prefix + ":access:%").toLowerCase(Locale.ROOT);
    jdbcTemplate.update(
        "INSERT INTO roles_permissions(role_id, permission_id) " +
            "SELECT ?, id FROM permissions WHERE lower(name) LIKE ? " +
            "ON CONFLICT DO NOTHING",
        adminRoleId, pattern);
  }

  public void assignAllPermissionsToAdmin() {
    UUID adminRoleId = ensureAdminRole();
    jdbcTemplate.update(
        "INSERT INTO roles_permissions(role_id, permission_id) " +
            "SELECT ?, id FROM permissions ON CONFLICT DO NOTHING",
        adminRoleId);
    roleRepository.findByName("ADMIN").ifPresent(role -> {
      role.setPermissions(new HashSet<>(permissionService.findAll()));
      roleRepository.save(role);
    });
  }

  private void ensureSystemColumns(String domain, String table) {
    if (table == null || table.isBlank()) {
      return;
    }
    String normalized = (domain == null ? "" : domain.trim().toLowerCase(Locale.ROOT));
    if ("orders".equals(normalized) || "order".equals(normalized)) {
      ensureColumnExists(table, "status", "text");
      ensureColumnExists(table, "assigned_agent", "text");
      ensureColumnExists(table, "store_name", "text");
      ensureColumnExists(table, "upsell", "boolean");
      ensureColumnExists(table, "sku_items", "jsonb");
      ensureSystemColumnPermissions(normalized, List.of("status", "assigned_agent", "store_name", "upsell", "sku_items"));
    }
  }

  private List<ColumnInfo> appendSystemColumnDefinitions(String domain, List<ColumnInfo> columns) {
    String normalized = (domain == null ? "" : domain.trim().toLowerCase(Locale.ROOT));
    if (!"orders".equals(normalized) && !"order".equals(normalized)) {
      return columns;
    }
    List<ColumnInfo> current = columns == null ? new java.util.ArrayList<>() : new java.util.ArrayList<>(columns);
    java.util.Set<String> existing = current.stream()
        .map(ColumnInfo::getName)
        .filter(java.util.Objects::nonNull)
        .map(name -> name.trim().toLowerCase(Locale.ROOT))
        .collect(java.util.stream.Collectors.toSet());

    if (!existing.contains("status")) {
      current.add(new ColumnInfo("Status", "status", "TEXT", "TEXT", true, null));
    }
    if (!existing.contains("store_name")) {
      current.add(new ColumnInfo("Store Name", "store_name", "TEXT", "TEXT", true, null));
    }
    if (!existing.contains("assigned_agent")) {
      current.add(new ColumnInfo("Assigned Agent", "assigned_agent", "TEXT", "TEXT", true, null));
    }
    return current;
  }

  private void ensureColumnExists(String table, String columnName, String sqlType) {
    if (table == null || columnName == null || table.isBlank() || columnName.isBlank()) {
      return;
    }
    Boolean exists = jdbcTemplate.queryForObject(
        """
            select exists (
              select 1 from information_schema.columns
              where table_schema = current_schema()
                and table_name = ?
                and column_name = ?
            )
            """,
        Boolean.class,
        table,
        columnName
    );
    if (Boolean.TRUE.equals(exists)) {
      return;
    }
    try (Connection conn = jdbcTemplate.getDataSource().getConnection()) {
      conn.setAutoCommit(true);
      try (Statement stmt = conn.createStatement()) {
        stmt.execute("alter table " + table + " add column if not exists " + columnName + " " + sqlType);
      }
    } catch (Exception ex) {
      log.warn("Failed to ensure column '{}' on table '{}': {}", columnName, table, ex.getMessage());
    }
  }

  private void ensureSystemColumnPermissions(String prefix, List<String> columnNames) {
    if (prefix == null || prefix.isBlank() || columnNames == null) {
      return;
    }
    for (String columnName : columnNames) {
      if (columnName == null || columnName.isBlank()) {
        continue;
      }
      String permissionName = prefix + ":access:" + columnName.trim().toLowerCase(Locale.ROOT);
      Permission perm = permissionService.ensure(permissionName);
      assignPermissionToAdmin(perm.getId());
    }
    assignAllColumnPermissionsToAdmin(prefix);
  }
}
