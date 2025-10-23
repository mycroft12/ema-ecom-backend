package com.mycroft.ema.ecom.domains.imports.service;

import com.mycroft.ema.ecom.domains.imports.dto.TemplateAnalysisResponse;
import com.mycroft.ema.ecom.auth.service.PermissionService;
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

  public DomainImportService(ExcelTemplateService templateService, JdbcTemplate jdbcTemplate,
                             PermissionService permissionService) {
    this.templateService = templateService;
    this.jdbcTemplate = jdbcTemplate;
    this.permissionService = permissionService;
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
    templateService.populateData(file, analysis);
    createColumnPermissions(domain, analysis);
    return analysis;
  }

  public String tableForDomain(String domain){
    return switch ((domain == null ? "" : domain.trim().toLowerCase(Locale.ROOT))){
      case "product", "products" -> "product_config";
      case "employee", "employees" -> "employee_config";
      case "delivery", "deliveries" -> "delivery_config";
      default -> throw new IllegalArgumentException("Unsupported domain: " + domain);
    };
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
