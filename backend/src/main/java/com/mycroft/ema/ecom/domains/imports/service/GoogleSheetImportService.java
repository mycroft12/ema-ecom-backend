package com.mycroft.ema.ecom.domains.imports.service;

import com.mycroft.ema.ecom.domains.imports.domain.GoogleImportConfig;
import com.mycroft.ema.ecom.domains.imports.dto.GoogleSheetConnectRequest;
import com.mycroft.ema.ecom.domains.imports.dto.GoogleSheetMetadataResponse;
import com.mycroft.ema.ecom.domains.imports.dto.TemplateAnalysisResponse;
import com.mycroft.ema.ecom.domains.imports.repo.GoogleImportConfigRepository;
import com.mycroft.ema.ecom.domains.imports.util.MemoryMultipartFile;
import com.mycroft.ema.ecom.integration.google.service.GoogleSheetsClient;
import com.mycroft.ema.ecom.integration.google.config.GoogleSheetsProperties;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
public class GoogleSheetImportService {

  private static final HexFormat HEX = HexFormat.of();
  private static final Set<String> SUPPORTED_TYPE_MARKERS = Set.of(
      "text",
      "varchar",
      "varchar(255)",
      "bigint",
      "uuid",
      "timestamp",
      "date",
      "boolean",
      "integer",
      "decimal",
      "minio:image",
      "minio:file",
      "minio_image",
      "minio_file"
  );

  private final GoogleSheetsClient sheetsClient;
  private final GoogleSheetsProperties properties;
  private final DomainImportService domainImportService;
  private final GoogleImportConfigRepository configRepository;

  public GoogleSheetImportService(GoogleSheetsClient sheetsClient,
                                  GoogleSheetsProperties properties,
                                  DomainImportService domainImportService,
                                  GoogleImportConfigRepository configRepository) {
    this.sheetsClient = sheetsClient;
    this.properties = properties;
    this.domainImportService = domainImportService;
    this.configRepository = configRepository;
  }

  @Transactional
  public TemplateAnalysisResponse connectAndImport(GoogleSheetConnectRequest request) {
    String domain = normalizeDomain(request.domain());
    String spreadsheetId = resolveSpreadsheetId(request);
    String tabName = normalizedTabName(request.tabName());
    String range = buildRange(tabName);

    List<List<Object>> values = sheetsClient.readSheet(spreadsheetId, range);
    if (values.isEmpty()) {
      throw new IllegalArgumentException("The provided sheet does not contain any data (missing header row)");
    }

    sanitizeSheetValues(values);

    byte[] csvBytes = toCsv(values);
    MemoryMultipartFile csvFile = new MemoryMultipartFile(
        "file",
        domain + "-google-import.csv",
        "text/csv",
        csvBytes
    );

    TemplateAnalysisResponse analysis = domainImportService.configureFromFile(domain, csvFile);
    long lastRowImported = Math.max(values.size() - 1L, 0L);
    String headerHash = hashHeader(values.get(0));

    GoogleImportConfig config = configRepository.findByDomain(domain)
        .orElse(new GoogleImportConfig(domain, spreadsheetId, tabName, headerHash, lastRowImported, "google"));
    config.setSpreadsheetId(spreadsheetId);
    config.setTabName(tabName);
    config.setHeaderHash(headerHash);
    config.setLastRowImported(lastRowImported);
    config.setSource("google");
    configRepository.save(config);

    return analysis;
  }

  public List<GoogleSheetMetadataResponse> listSheets(String spreadsheetId) {
    if (spreadsheetId == null || spreadsheetId.isBlank()) {
      throw new IllegalArgumentException("Spreadsheet identifier is required to list sheets.");
    }
    return sheetsClient.listSheets(spreadsheetId.trim());
  }

  private String resolveSpreadsheetId(GoogleSheetConnectRequest request) {
    String spreadsheetId = request.spreadsheetId();
    if (spreadsheetId != null && !spreadsheetId.isBlank()) {
      return spreadsheetId.trim();
    }
    if (request.sheetUrl() == null || request.sheetUrl().isBlank()) {
      throw new IllegalArgumentException("A Google Sheet must be selected before connecting.");
    }
    return sheetsClient.extractSpreadsheetId(request.sheetUrl());
  }

  private String normalizeDomain(String domain) {
    if (domain == null || domain.isBlank()) {
      throw new IllegalArgumentException("domain is required");
    }
    String normalized = domain.trim().toLowerCase(Locale.ROOT);
    // Validate via table resolution (throws if unsupported)
    domainImportService.tableForDomain(normalized);
    return normalized;
  }

  private String normalizedTabName(String tabName) {
    if (tabName == null || tabName.isBlank()) {
      throw new IllegalArgumentException("Please select a sheet tab to import.");
    }
    return tabName.trim();
  }

  private String buildRange(String tabName) {
    String baseRange = properties.defaultReadRange();
    return tabName == null ? baseRange : tabName + "!" + baseRange;
  }

  private void sanitizeSheetValues(List<List<Object>> values) {
    if (values.isEmpty()) {
      return;
    }
    List<Object> headerRow = values.get(0);
    if (headerRow == null || headerRow.isEmpty()) {
      throw new IllegalArgumentException("Header row (first row) cannot be empty.");
    }
    int columnCount = headerRow.size();
    for (int i = 0; i < columnCount; i++) {
      Object raw = headerRow.get(i);
      String header = raw == null ? "" : raw.toString().trim();
      if (header.isEmpty()) {
        throw new IllegalArgumentException("Column " + (i + 1) + " has an empty name. Please provide a header in row 1.");
      }
      String sanitized = header.replaceAll("\\s+", "_");
      headerRow.set(i, sanitized);
    }

    detectDuplicateHeaders(headerRow);

    if (values.size() > 1) {
      List<Object> typeRow = values.get(1);
      if (typeRow != null && containsAnyNonBlank(typeRow)) {
        validateTypeRow(headerRow, typeRow);
      }
    }
  }

  private void detectDuplicateHeaders(List<Object> headerRow) {
    Set<String> seen = new java.util.HashSet<>();
    for (Object headerObj : headerRow) {
      String header = headerObj == null ? "" : headerObj.toString();
      String normalized = header.toLowerCase(Locale.ROOT);
      if (!seen.add(normalized)) {
        throw new IllegalArgumentException("Duplicate column name detected: '" + header + "'. Please ensure headers are unique.");
      }
    }
  }

  private boolean containsAnyNonBlank(List<Object> typeRow) {
    for (Object cell : typeRow) {
      if (cell != null && !cell.toString().trim().isEmpty()) {
        return true;
      }
    }
    return false;
  }

  private void validateTypeRow(List<Object> headerRow, List<Object> typeRow) {
    for (int i = 0; i < headerRow.size(); i++) {
      String header = headerRow.get(i).toString();
      String marker = (typeRow.size() > i && typeRow.get(i) != null)
          ? typeRow.get(i).toString().trim()
          : "";
      if (marker.isEmpty()) {
        throw new IllegalArgumentException("Row 2 column " + (i + 1) + " (header '" + header + "') is empty. Please specify a data type or clear row 2.");
      }
      if (!isSupportedTypeMarker(marker)) {
        throw new IllegalArgumentException(getUnsupportedTypeErrorMessage(marker, header, i + 1));
      }
      typeRow.set(i, normalizeTypeMarker(marker));
    }
  }

  private boolean isSupportedTypeMarker(String marker) {
    if (marker == null) {
      return false;
    }
    String s = marker.trim().toLowerCase(Locale.ROOT);
    if (s.startsWith("numeric(") && s.endsWith(")")) {
      return true;
    }
    return SUPPORTED_TYPE_MARKERS.contains(s);
  }

  private String normalizeTypeMarker(String marker) {
    String lower = marker.trim().toLowerCase(Locale.ROOT);
    if (lower.startsWith("numeric(")) {
      return marker.trim().toUpperCase(Locale.ROOT);
    }
    return lower.toUpperCase(Locale.ROOT).replace(':', '_');
  }

  private String getUnsupportedTypeErrorMessage(String type, String columnName, int columnIndex) {
    return "Unsupported data type '" + type + "' in row 2 column " + columnIndex + " (header '" + columnName
        + "'). Supported types are: text, varchar, varchar(255), bigint, uuid, timestamp, date, boolean, "
        + "integer, decimal, numeric(x,y), minio:image, minio:file, minio_image, minio_file";
  }

  private byte[] toCsv(List<List<Object>> values) {
    StringBuilder sb = new StringBuilder();
    for (int i = 0; i < values.size(); i++) {
      List<Object> row = values.get(i);
      for (int c = 0; c < row.size(); c++) {
        if (c > 0) {
          sb.append(',');
        }
        String cell = row.get(c) == null ? "" : row.get(c).toString();
        sb.append(escapeCsv(cell));
      }
      if (i < values.size() - 1) {
        sb.append('\n');
      }
    }
    return sb.toString().getBytes(StandardCharsets.UTF_8);
  }

  private String escapeCsv(String value) {
    if (value.contains("\"") || value.contains(",") || value.contains("\n")) {
      String escaped = value.replace("\"", "\"\"");
      return "\"" + escaped + "\"";
    }
    return value;
  }

  private String hashHeader(List<Object> headerRow) {
    try {
      MessageDigest digest = MessageDigest.getInstance("SHA-256");
      for (Object cell : headerRow) {
        String value = cell == null ? "" : cell.toString().trim().toLowerCase(Locale.ROOT);
        digest.update(value.getBytes(StandardCharsets.UTF_8));
        digest.update((byte) '\n');
      }
      return HEX.formatHex(digest.digest());
    } catch (NoSuchAlgorithmException e) {
      throw new IllegalStateException("SHA-256 not available", e);
    }
  }
}
