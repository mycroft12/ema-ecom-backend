package com.mycroft.ema.ecom.domains.imports.service;

import com.mycroft.ema.ecom.common.metadata.ColumnSemanticsService;
import com.mycroft.ema.ecom.domains.imports.dto.ColumnInfo;
import com.mycroft.ema.ecom.domains.imports.dto.TemplateAnalysisResponse;
import com.mycroft.ema.ecom.auth.service.PermissionService;
import com.mycroft.ema.ecom.auth.domain.Permission;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.sql.Connection;
import java.sql.Statement;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
public class DomainImportService {

  private final ExcelTemplateService templateService;
  private final JdbcTemplate jdbcTemplate;
  private final PermissionService permissionService;
  private final ColumnSemanticsService columnSemanticsService;

  public DomainImportService(ExcelTemplateService templateService, JdbcTemplate jdbcTemplate,
                             PermissionService permissionService,
                             ColumnSemanticsService columnSemanticsService) {
    this.templateService = templateService;
    this.jdbcTemplate = jdbcTemplate;
    this.permissionService = permissionService;
    this.columnSemanticsService = columnSemanticsService;
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
    executeDdl(analysis.getCreateTableSql());
    ensureDomainBasePermissions(domain);
    templateService.populateData(file, analysis);
    persistColumnSemantics(domain, table, analysis.getColumns());
    createColumnPermissions(domain, analysis);
    return analysis;
  }

  public boolean ensureDefaultComponent(String domain, List<ColumnInfo> columns) {
    String table = tableForDomain(domain);
    if (tableExists(table)) {
      return false;
    }
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
      case "expense", "expenses", "commission", "commissions" -> "expenses_config";
      case "ad", "ads", "advertising", "marketing" -> "ads_config";
      default -> throw new IllegalArgumentException("Unsupported domain: " + domain);
    };
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
        normalized + ":delete"
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
      String permissionName = prefix + ":access:" + column.getName();
      var permission = permissionService.ensure(permissionName);
      assignPermissionToAdmin(permission.getId());
    });
  }

  private void createActionPermissions(String prefix) {
    List<String> actions = List.of("add", "update", "delete");
    actions.forEach(action -> {
      String permissionName = prefix + ":action:" + action;
      var permission = permissionService.ensure(permissionName);
      assignPermissionToAdmin(permission.getId());
    });
  }

  private void assignPermissionToAdmin(UUID permissionId) {
    jdbcTemplate.update(
        "INSERT INTO roles_permissions(role_id, permission_id) " +
            "SELECT r.id, ? FROM roles r WHERE r.name = 'ADMIN' " +
            "ON CONFLICT DO NOTHING", permissionId);
  }
}
