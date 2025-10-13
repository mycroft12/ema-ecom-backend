package com.mycroft.ema.ecom.domains.imports.web;

import com.mycroft.ema.ecom.domains.imports.dto.TemplateAnalysisResponse;
import com.mycroft.ema.ecom.domains.imports.service.ExcelTemplateService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.dao.DataAccessException;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.jdbc.core.JdbcTemplate;

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
  @Operation(summary = "Configure domain from template", description = "Upload a filled Excel template (.xlsx/.xls) and specify domain=product|employee|delivery. The service will infer columns and create/update the corresponding table.")
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
}
