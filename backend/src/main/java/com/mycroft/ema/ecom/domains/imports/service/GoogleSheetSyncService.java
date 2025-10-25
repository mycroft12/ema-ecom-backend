package com.mycroft.ema.ecom.domains.imports.service;

import com.mycroft.ema.ecom.domains.imports.domain.GoogleImportConfig;
import com.mycroft.ema.ecom.domains.imports.dto.GoogleSheetSyncRequest;
import com.mycroft.ema.ecom.domains.imports.repo.GoogleImportConfigRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
public class GoogleSheetSyncService {

  private static final Logger log = LoggerFactory.getLogger(GoogleSheetSyncService.class);

  private final GoogleImportConfigRepository configRepository;
  private final DomainImportService domainImportService;
  private final JdbcTemplate jdbcTemplate;

  public GoogleSheetSyncService(GoogleImportConfigRepository configRepository,
                                DomainImportService domainImportService,
                                JdbcTemplate jdbcTemplate) {
    this.configRepository = configRepository;
    this.domainImportService = domainImportService;
    this.jdbcTemplate = jdbcTemplate;
  }

  @Transactional
  public void syncRow(GoogleSheetSyncRequest request) {
    String domain = normalizeDomain(request.domain());
    GoogleImportConfig config = configRepository.findByDomain(domain)
        .orElseThrow(() -> new IllegalArgumentException("Domain '" + domain + "' is not connected to Google Sheets."));

    if (request.spreadsheetId() != null && !request.spreadsheetId().isBlank()) {
      String incoming = request.spreadsheetId().trim();
      if (!incoming.equals(config.getSpreadsheetId())) {
        throw new IllegalArgumentException("Spreadsheet mismatch for domain '" + domain + "'.");
      }
    }

    if (config.getTabName() != null && request.tabName() != null
        && !config.getTabName().equalsIgnoreCase(request.tabName().trim())) {
      throw new IllegalArgumentException("Tab mismatch for domain '" + domain + "'. Expected '" + config.getTabName() + "'");
    }

    String table = domainImportService.tableForDomain(domain);
    Map<String, Object> sanitizedRow = sanitizeRow(request.row());
    Set<String> allowedColumns = allowedColumnsForTable(table);
    if (allowedColumns.isEmpty()) {
      throw new IllegalStateException("Unable to resolve columns for table '" + table + "'");
    }

    sanitizedRow.keySet().removeIf(col -> !allowedColumns.contains(col));
    if (!allowedColumns.contains("id")) {
      throw new IllegalStateException("Table '" + table + "' must contain an 'id' column for sync operations.");
    }

    String action = Optional.ofNullable(request.action())
        .map(a -> a.trim().toUpperCase(Locale.ROOT))
        .orElse("UPSERT");

    UUID rowId = resolveRowId(sanitizedRow);
    if (!sanitizedRow.containsKey("id")) {
      sanitizedRow.put("id", rowId);
    }

    if ("DELETE".equals(action)) {
      deleteRow(table, rowId);
      log.debug("Deleted row {} from {}", rowId, table);
    } else {
      upsertRow(table, sanitizedRow);
      log.debug("Upserted row {} into {}", rowId, table);
    }

    if (request.rowNumber() != null
        && request.rowNumber() > config.getLastRowImported()) {
      config.setLastRowImported(request.rowNumber());
      configRepository.save(config);
    }
  }

  private String normalizeDomain(String domain) {
    if (domain == null || domain.isBlank()) {
      throw new IllegalArgumentException("domain is required");
    }
    return domain.trim().toLowerCase(Locale.ROOT);
  }

  private Map<String, Object> sanitizeRow(Map<String, Object> row) {
    if (row == null || row.isEmpty()) {
      throw new IllegalArgumentException("row payload is required");
    }
    Map<String, Object> sanitized = new LinkedHashMap<>();
    for (Map.Entry<String, Object> entry : row.entrySet()) {
      String column = normalizeColumnName(entry.getKey());
      Object value = normalizeValue(entry.getValue());
      sanitized.put(column, value);
    }
    return sanitized;
  }

  private String normalizeColumnName(String name) {
    if (name == null || name.isBlank()) {
      throw new IllegalArgumentException("Column names cannot be null or blank.");
    }
    String normalized = name.trim().toLowerCase(Locale.ROOT)
        .replaceAll("[^a-z0-9_]", "_");
    if (!normalized.matches("[a-z][a-z0-9_]*")) {
      throw new IllegalArgumentException("Unsupported column name '" + name + "'");
    }
    return normalized;
  }

  private Object normalizeValue(Object value) {
    if (value == null) {
      return null;
    }
    if (value instanceof String str) {
      String trimmed = str.trim();
      return trimmed.isEmpty() ? null : trimmed;
    }
    return value;
  }

  private UUID resolveRowId(Map<String, Object> row) {
    Object idValue = row.get("id");
    if (idValue == null || idValue.toString().isBlank()) {
      UUID generated = UUID.randomUUID();
      row.put("id", generated);
      return generated;
    }
    try {
      UUID uuid = UUID.fromString(idValue.toString().trim());
      row.put("id", uuid);
      return uuid;
    } catch (IllegalArgumentException ex) {
      throw new IllegalArgumentException("id column must be a valid UUID value", ex);
    }
  }

  private Set<String> allowedColumnsForTable(String table) {
    List<String> columns = jdbcTemplate.queryForList(
        "select column_name from information_schema.columns where table_schema = current_schema() and table_name = ?",
        String.class,
        table
    );
    return new HashSet<>(columns);
  }

  private void upsertRow(String table, Map<String, Object> row) {
    LinkedHashMap<String, Object> ordered = new LinkedHashMap<>();
    ordered.put("id", row.get("id"));
    row.forEach((k, v) -> {
      if (!"id".equals(k)) {
        ordered.put(k, v);
      }
    });

    List<String> columns = new ArrayList<>(ordered.keySet());
    String insertColumns = String.join(", ", columns);
    String insertPlaceholders = String.join(", ", Collections.nCopies(columns.size(), "?"));

    List<String> updates = new ArrayList<>();
    for (String column : columns) {
      if (!"id".equals(column)) {
        updates.add(column + " = EXCLUDED." + column);
      }
    }
    if (updates.isEmpty()) {
      throw new IllegalArgumentException("Sync payload must include at least one column besides 'id'.");
    }

    String upsertSql = "INSERT INTO " + table + " (" + insertColumns + ") VALUES (" + insertPlaceholders + ") "
        + "ON CONFLICT (id) DO UPDATE SET " + String.join(", ", updates);

    jdbcTemplate.update(upsertSql, ordered.values().toArray());
  }

  private void deleteRow(String table, UUID rowId) {
    jdbcTemplate.update("DELETE FROM " + table + " WHERE id = ?", rowId);
  }
}
