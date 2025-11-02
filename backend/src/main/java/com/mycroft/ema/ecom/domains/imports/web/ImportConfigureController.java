package com.mycroft.ema.ecom.domains.imports.web;

import com.mycroft.ema.ecom.domains.imports.dto.TemplateAnalysisResponse;
import com.mycroft.ema.ecom.domains.imports.service.DomainImportService;
import com.mycroft.ema.ecom.domains.imports.repo.GoogleImportConfigRepository;
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

  private final DomainImportService domainImportService;
  private final JdbcTemplate jdbcTemplate;
  private final GoogleImportConfigRepository googleImportConfigRepository;

  public ImportConfigureController(DomainImportService domainImportService,
                                   JdbcTemplate jdbcTemplate,
                                   GoogleImportConfigRepository googleImportConfigRepository) {
    this.domainImportService = domainImportService;
    this.jdbcTemplate = jdbcTemplate;
    this.googleImportConfigRepository = googleImportConfigRepository;
  }

  @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  @PreAuthorize("hasAuthority('import:configure')")
  @Transactional
  @Operation(summary = "Configure domain from template", description = "Upload a filled Excel template (.xlsx/.xls/.csv) and specify domain=product. The service will infer columns and create/update the corresponding table.")
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

    TemplateAnalysisResponse analysis = domainImportService.configureFromFile(domain, file);
    return analysis;
  }

  @GetMapping(value = "/template-example")
  @PreAuthorize("hasAuthority('import:template')")
  @Operation(summary = "Download template example", description = "Download a CSV example template for product.")
  public ResponseEntity<Resource> templateExample(@RequestParam("domain") String domain,
                                                  @RequestParam(value = "format", required = false, defaultValue = "csv") String format) {
    String base = switch ((domain == null ? "" : domain.trim().toLowerCase())) {
      case "product", "products" -> "product";
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
  public record DomainTableInfo(String domain, String tableName, long rowCount, String source) {}

  private String tableForDomain(String domain){
    return switch ((domain == null ? "" : domain.trim().toLowerCase())){
      case "product", "products" -> "product_config";
      default -> throw new IllegalArgumentException("Unsupported domain: " + domain);
    };
  }

  @GetMapping("/tables")
  @PreAuthorize("hasAuthority('import:configure')")
  @Operation(summary = "List configured domain tables", description = "Returns existing component tables with row counts.")
  public List<DomainTableInfo> listTables(){
    List<DomainTableInfo> out = new ArrayList<>();
    String[] domains = new String[]{"product", "orders", "expenses", "ads"};
    for (String d : domains){
      String table = domainImportService.tableForDomain(d);
      Boolean exists = jdbcTemplate.queryForObject(
          "select exists (select 1 from information_schema.tables where table_schema = current_schema() and table_name = ?)",
          Boolean.class, table);
      if (Boolean.TRUE.equals(exists)){
        Long count = jdbcTemplate.queryForObject("select count(*) from " + table, Long.class);
        String source = googleImportConfigRepository.findByDomain(d)
            .map(config -> {
              String value = config.getSource();
              return value == null || value.isBlank() ? "dynamic" : value.toLowerCase(Locale.ROOT);
            })
            .orElse("dynamic");
        out.add(new DomainTableInfo(d, table, count == null ? 0L : count, source));
      }
    }
    return out;
  }

  @DeleteMapping("/table")
  @PreAuthorize("hasAuthority('import:configure')")
  @Transactional
  @Operation(summary = "Delete a domain table", description = "Drops the specified component table and all its data.")
  public ResponseEntity<Void> dropTable(@RequestParam("domain") String domain){
    String normalizedDomain = (domain == null ? "" : domain.trim().toLowerCase(Locale.ROOT));
    if (normalizedDomain.isEmpty()) {
      throw new IllegalArgumentException("Unsupported domain: " + domain);
    }
    String table = domainImportService.tableForDomain(domain);
    try (java.sql.Connection conn = jdbcTemplate.getDataSource().getConnection()) {
      // Use a separate connection with auto-commit to ensure DDL is committed
      conn.setAutoCommit(true);
      try (java.sql.Statement stmt = conn.createStatement()) {
        stmt.execute("drop table if exists " + table + " cascade");
      }
      jdbcTemplate.update("delete from column_semantics where table_name = ?", table);
      googleImportConfigRepository.findByDomain(normalizedDomain).ifPresent(googleImportConfigRepository::delete);
      domainImportService.cleanupLegacyPermissions(normalizedDomain);

      List<String> exactPermissionNames = List.of(
          normalizedDomain + ":read",
          normalizedDomain + ":create",
          normalizedDomain + ":update",
          normalizedDomain + ":delete",
          normalizedDomain + ":export:excel"
      );
      for (String name : exactPermissionNames) {
        String lowered = name.toLowerCase(Locale.ROOT);
        jdbcTemplate.update(
            "delete from roles_permissions where permission_id in (select id from permissions where lower(name) = ?)",
            lowered);
        jdbcTemplate.update("delete from permissions where lower(name) = ?", lowered);
      }

      List<String> patterns = List.of(
          normalizedDomain + ":access:%",
          normalizedDomain + ":action:%"
      );
      for (String pattern : patterns) {
        jdbcTemplate.update(
            "delete from roles_permissions where permission_id in (select id from permissions where lower(name) like ?)",
            pattern);
        jdbcTemplate.update("delete from permissions where lower(name) like ?", pattern);
      }
      return ResponseEntity.noContent().build();
    } catch (DataAccessException ex) {
      throw new RuntimeException("Failed to drop table '" + table + "': " + ex.getMessage(), ex);
    } catch (java.sql.SQLException ex) {
      throw new RuntimeException("Database connection error: " + ex.getMessage(), ex);
    }
  }
}
