package com.mycroft.ema.ecom.domains.imports.web;

import com.mycroft.ema.ecom.domains.imports.dto.TemplateAnalysisResponse;
import com.mycroft.ema.ecom.domains.imports.service.ExcelTemplateService;
import com.mycroft.ema.ecom.auth.service.PermissionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@RestController
@RequestMapping("/api/import/configure")
@Tag(name = "Import Configure", description = "Upload a completed template to configure a domain schema and create backing table")
public class ImportConfigureController {

  private final ExcelTemplateService templateService;
  private final JdbcTemplate jdbcTemplate;
  private final PermissionService permissionService;

  public ImportConfigureController(ExcelTemplateService templateService, JdbcTemplate jdbcTemplate,
                                   PermissionService permissionService) {
    this.templateService = templateService;
    this.jdbcTemplate = jdbcTemplate;
    this.permissionService = permissionService;
  }

  @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  @PreAuthorize("hasAuthority('import:configure')")
  @Transactional
  @Operation(summary = "Configure domain from template", description = "Upload a filled Excel template (.xlsx/.xls/.csv) and specify domain=product|employee|delivery. The service will infer columns and create/update the corresponding table.")
  public TemplateAnalysisResponse configure(@RequestParam("domain") String domain,
                                           @RequestPart("file") MultipartFile file){
    // Validate file is not empty
    if (file.isEmpty()) {
      throw new IllegalArgumentException("Please upload a non-empty file");
    }

    // Validate file extension
    String filename = file.getOriginalFilename();
    if (filename == null || !(filename.toLowerCase().endsWith(".xlsx") || 
                             filename.toLowerCase().endsWith(".xls") || 
                             filename.toLowerCase().endsWith(".csv"))) {
      throw new IllegalArgumentException("Unsupported file format. Please upload an Excel (.xlsx/.xls) or CSV (.csv) file");
    }

    String table = switch ((domain == null ? "" : domain.trim().toLowerCase())){
      case "product", "products" -> "product_config";
      case "employee", "employees" -> "employee_config";
      case "delivery", "deliveries" -> "delivery_config";
      default -> throw new IllegalArgumentException("Unsupported domain: " + domain);
    };

    TemplateAnalysisResponse analysis = templateService.analyzeTemplate(file, table);

    // Execute the generated DDL (CREATE TABLE IF NOT EXISTS ...)
    try (java.sql.Connection conn = jdbcTemplate.getDataSource().getConnection()) {
      // Use a separate connection with auto-commit to ensure DDL is committed
      conn.setAutoCommit(true);
      try (java.sql.Statement stmt = conn.createStatement()) {
        stmt.execute(analysis.getCreateTableSql());
      }
    } catch (DataAccessException ex) {
      throw new RuntimeException("Failed to create/update table for domain '" + domain + "': " + ex.getMessage(), ex);
    } catch (java.sql.SQLException ex) {
      throw new RuntimeException("Database connection error: " + ex.getMessage(), ex);
    }

    templateService.populateData(file, analysis);

    createColumnPermissions(domain, analysis);

    return analysis;
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

  private void assignPermissionToAdmin(java.util.UUID permissionId) {
    jdbcTemplate.update(
        "INSERT INTO roles_permissions(role_id, permission_id) " +
            "SELECT r.id, ? FROM roles r WHERE r.name = 'ADMIN' " +
            "ON CONFLICT DO NOTHING", permissionId);
  }

  @GetMapping(value = "/template-example")
  @PreAuthorize("hasAuthority('import:template')")
  @Operation(summary = "Download template example", description = "Download a CSV example template for product, employee or delivery.")
  public ResponseEntity<Resource> templateExample(@RequestParam("domain") String domain,
                                                  @RequestParam(value = "format", required = false, defaultValue = "csv") String format) {
    String base = switch ((domain == null ? "" : domain.trim().toLowerCase())) {
      case "product", "products" -> "product";
      case "employee", "employees" -> "employee";
      case "delivery", "deliveries" -> "delivery";
      default -> throw new IllegalArgumentException("Unsupported domain: " + domain);
    };
    String ext = "xlsx".equalsIgnoreCase(format) ? "xlsx" : "csv";
    String filename = base + "-template-example." + ext;
    Resource resource = new ClassPathResource("templates/" + filename);
    if (!resource.exists()) {
      filename = base + "-template-example.csv";
      resource = new ClassPathResource("templates/" + filename);
      if (!resource.exists()) {
        return ResponseEntity.notFound().build();
      }
      ext = "csv";
    }
    MediaType contentType = "xlsx".equals(ext)
        ? MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        : MediaType.parseMediaType("text/csv");
    return ResponseEntity.ok()
        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + filename)
        .contentType(contentType)
        .body(resource);
  }

  // --- Admin utilities: list and drop configured domain tables ---
  public record DomainTableInfo(String domain, String tableName, long rowCount) {}

  private String tableForDomain(String domain){
    return switch ((domain == null ? "" : domain.trim().toLowerCase())){
      case "product", "products" -> "product_config";
      case "employee", "employees" -> "employee_config";
      case "delivery", "deliveries" -> "delivery_config";
      default -> throw new IllegalArgumentException("Unsupported domain: " + domain);
    };
  }

  @GetMapping("/tables")
  @PreAuthorize("hasAuthority('import:configure')")
  @Operation(summary = "List configured domain tables", description = "Returns existing component tables with row counts.")
  public List<DomainTableInfo> listTables(){
    List<DomainTableInfo> out = new ArrayList<>();
    String[] domains = new String[]{"product","employee","delivery"};
    for (String d : domains){
      String table = tableForDomain(d);
      Boolean exists = jdbcTemplate.queryForObject(
          "select exists (select 1 from information_schema.tables where table_schema = current_schema() and table_name = ?)",
          Boolean.class, table);
      if (Boolean.TRUE.equals(exists)){
        Long count = jdbcTemplate.queryForObject("select count(*) from " + table, Long.class);
        out.add(new DomainTableInfo(d, table, count == null ? 0L : count));
      }
    }
    return out;
  }

  @DeleteMapping("/table")
  @PreAuthorize("hasAuthority('import:configure')")
  @Transactional
  @Operation(summary = "Delete a domain table", description = "Drops the specified component table and all its data.")
  public ResponseEntity<Void> dropTable(@RequestParam("domain") String domain){
    String table = tableForDomain(domain);
    try (java.sql.Connection conn = jdbcTemplate.getDataSource().getConnection()) {
      // Use a separate connection with auto-commit to ensure DDL is committed
      conn.setAutoCommit(true);
      try (java.sql.Statement stmt = conn.createStatement()) {
        stmt.execute("drop table if exists " + table + " cascade");
      }
      return ResponseEntity.noContent().build();
    } catch (DataAccessException ex) {
      throw new RuntimeException("Failed to drop table '" + table + "': " + ex.getMessage(), ex);
    } catch (java.sql.SQLException ex) {
      throw new RuntimeException("Database connection error: " + ex.getMessage(), ex);
    }
  }
}
