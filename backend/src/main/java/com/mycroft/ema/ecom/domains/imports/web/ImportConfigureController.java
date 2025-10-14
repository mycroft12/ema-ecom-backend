package com.mycroft.ema.ecom.domains.imports.web;

import com.mycroft.ema.ecom.domains.imports.dto.TemplateAnalysisResponse;
import com.mycroft.ema.ecom.domains.imports.service.ExcelTemplateService;
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

@RestController
@RequestMapping("/api/import/configure")
@Tag(name = "Import Configure", description = "Upload a completed template to configure a domain schema and create backing table")
public class ImportConfigureController {

  private final ExcelTemplateService templateService;
  private final JdbcTemplate jdbcTemplate;

  public ImportConfigureController(ExcelTemplateService templateService, JdbcTemplate jdbcTemplate) {
    this.templateService = templateService;
    this.jdbcTemplate = jdbcTemplate;
  }

  @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  @PreAuthorize("hasAuthority('import:configure')")
  @Transactional
  @Operation(summary = "Configure domain from template", description = "Upload a filled Excel template (.xlsx/.xls/.csv) and specify domain=product|employee|delivery. The service will infer columns and create/update the corresponding table.")
  public TemplateAnalysisResponse configure(@RequestParam("domain") String domain,
                                           @RequestPart("file") MultipartFile file){
    String table = switch ((domain == null ? "" : domain.trim().toLowerCase())){
      case "product", "products" -> "product_config";
      case "employee", "employees" -> "employee_config";
      case "delivery", "deliveries" -> "delivery_config";
      default -> throw new IllegalArgumentException("Unsupported domain: " + domain);
    };

    TemplateAnalysisResponse analysis = templateService.analyzeTemplate(file, table);

    // Execute the generated DDL (CREATE TABLE IF NOT EXISTS ...)
    try {
      jdbcTemplate.execute(analysis.getCreateTableSql());
    } catch (DataAccessException ex) {
      throw new RuntimeException("Failed to create/update table for domain '" + domain + "': " + ex.getMessage(), ex);
    }

    return analysis;
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
    try {
      jdbcTemplate.execute("drop table if exists " + table + " cascade");
      return ResponseEntity.noContent().build();
    } catch (DataAccessException ex) {
      throw new RuntimeException("Failed to drop table '" + table + "': " + ex.getMessage(), ex);
    }
  }
}
