package com.mycroft.ema.ecom.domains.imports.web;

import com.mycroft.ema.ecom.domains.imports.dto.TemplateAnalysisResponse;
import com.mycroft.ema.ecom.domains.imports.service.ExcelTemplateService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

/**
 * Provides endpoints to analyze import templates and download pre-built examples for supported domains.
 */
@RestController
@RequestMapping("/api/import/template")
@Tag(name = "Import Template", description = "Analyze Excel template to generate table DDL and download example templates")
public class ImportTemplateController {
  private final ExcelTemplateService service;
  public ImportTemplateController(ExcelTemplateService service){ this.service = service; }

  @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  @PreAuthorize("hasAuthority('import:configure')")
  @Operation(summary = "Analyze Excel template", description = "Upload an Excel file (.xlsx/.xls). The first row must contain headers. Returns inferred columns and a CREATE TABLE SQL you can use in a Flyway migration.")
  public TemplateAnalysisResponse analyze(@RequestPart("file") MultipartFile file,
                                          @RequestParam("tableName") String tableName){
    return service.analyzeTemplate(file, tableName);
  }

  @GetMapping(produces = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
  @PreAuthorize("hasAuthority('import:configure')")
  @Operation(summary = "Download domain template", description = "Download an Excel template for a supported domain (product, orders, expenses, ads). Use query param 'domain'.")
  public ResponseEntity<byte[]> byDomain(@RequestParam("domain") String domain){
    byte[] data = service.generateExampleTemplate(domain);
    String filename = "import_template_" + domain + ".xlsx";
    return ResponseEntity.ok()
        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + filename)
        .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
        .body(data);
  }

  @GetMapping(value = "/example", produces = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
  @PreAuthorize("hasAuthority('import:configure')")
  @Operation(summary = "Download example template", description = "Download an example Excel template. Optional query param 'type' can be product, orders, expenses, or ads.")
  public ResponseEntity<byte[]> example(@RequestParam(value = "type", required = false) String type){
    byte[] data = service.generateExampleTemplate(type);
    String filename = "import_template" + (type != null ? ("_"+type) : "") + ".xlsx";
    return ResponseEntity.ok()
        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + filename)
        .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
        .body(data);
  }
}
