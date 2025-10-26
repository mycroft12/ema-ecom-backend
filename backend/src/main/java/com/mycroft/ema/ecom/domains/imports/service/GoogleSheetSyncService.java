package com.mycroft.ema.ecom.domains.imports.service;

import com.mycroft.ema.ecom.domains.imports.domain.GoogleImportConfig;
import com.mycroft.ema.ecom.domains.imports.dto.GoogleSheetSyncRequest;
import com.mycroft.ema.ecom.domains.imports.repo.GoogleImportConfigRepository;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.sql.Date;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.util.*;
@Slf4j
@Service
public class GoogleSheetSyncService {


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
    Map<String, String> columnTypes = columnTypesForTable(table);
    if (allowedColumns.isEmpty()) {
      throw new IllegalStateException("Unable to resolve columns for table '" + table + "'");
    }

    sanitizedRow.keySet().removeIf(col -> !allowedColumns.contains(col));
    coerceColumnValues(sanitizedRow, columnTypes);
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

  private Map<String, String> columnTypesForTable(String table) {
    List<Map<String, Object>> rows = jdbcTemplate.queryForList(
        "select column_name, data_type from information_schema.columns where table_schema = current_schema() and table_name = ?",
        table
    );
    Map<String, String> types = new HashMap<>();
    for (Map<String, Object> row : rows) {
      Object name = row.get("column_name");
      Object type = row.get("data_type");
      if (name != null && type != null) {
        types.put(name.toString().toLowerCase(Locale.ROOT), type.toString().toLowerCase(Locale.ROOT));
      }
    }
    return types;
  }

  private void coerceColumnValues(Map<String, Object> row, Map<String, String> columnTypes) {
    if (row == null || columnTypes.isEmpty()) {
      return;
    }
    for (Map.Entry<String, Object> entry : row.entrySet()) {
      String column = entry.getKey();
      Object value = entry.getValue();
      if (value == null) continue;
      String type = columnTypes.get(column);
      if (type == null) continue;
      switch (type) {
        case "uuid" -> entry.setValue(convertToUuid(value));
        case "boolean" -> entry.setValue(convertToBoolean(value));
        case "smallint", "integer", "bigint" -> entry.setValue(convertToLong(value));
        case "numeric", "decimal", "double precision", "real" -> entry.setValue(convertToBigDecimal(value));
        case "timestamp without time zone", "timestamp with time zone", "timestamp" ->
            entry.setValue(convertToTimestamp(value));
        case "date" -> entry.setValue(convertToDate(value));
        default -> {
          // leave as-is for text/timestamp/date/etc.
        }
      }
    }
  }

  private void upsertRow(String table, Map<String, Object> row) {
    LinkedHashMap<String, Object> ordered = new LinkedHashMap<>();
    ordered.put("id", row.get("id"));
    row.forEach((k, v) -> {
      if (!"id".equals(k)) {
        ordered.put(k, v);
      }
    });

    UUID id = (UUID) ordered.get("id");
    Long existing = jdbcTemplate.queryForObject(
        "select count(*) from " + table + " where id = ?",
        Long.class,
        id
    );
    long count = existing == null ? 0L : existing;
    if (count == 0L) {
      log.debug("No existing row found with id {} in {}", id, table);
    } else {
      log.debug("Found {} row(s) with id {} in {}", count, id, table);
    }

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

    try {
      jdbcTemplate.update(upsertSql, ordered.values().toArray());
    } catch (Exception ex) {
      log.error("Failed to upsert row {} in {}: {}", id, table, ex.getMessage(), ex);
      throw ex;
    }

    try {
      Map<String, Object> refreshed = jdbcTemplate.queryForMap(
          "select product_name from " + table + " where id = ?",
          id
      );
      log.debug("Row after upsert for id {}: {}", id, refreshed);
    } catch (Exception ex) {
      log.warn("Unable to fetch row {} after upsert in {}: {}", id, table, ex.getMessage());
    }
  }

  private void deleteRow(String table, UUID rowId) {
    jdbcTemplate.update("DELETE FROM " + table + " WHERE id = ?", rowId);
  }

  private UUID convertToUuid(Object value) {
    if (value instanceof UUID uuid) {
      return uuid;
    }
    return UUID.fromString(value.toString().trim());
  }

  private Boolean convertToBoolean(Object value) {
    if (value instanceof Boolean b) {
      return b;
    }
    String s = value.toString().trim().toLowerCase(Locale.ROOT);
    if ("true".equals(s) || "1".equals(s)) return Boolean.TRUE;
    if ("false".equals(s) || "0".equals(s)) return Boolean.FALSE;
    throw new IllegalArgumentException("Cannot convert value '" + value + "' to boolean");
  }

  private Long convertToLong(Object value) {
    if (value instanceof Number num) {
      return num.longValue();
    }
    String s = value.toString().trim();
    if (s.isEmpty()) return null;
    return Long.parseLong(s);
  }

  private BigDecimal convertToBigDecimal(Object value) {
    if (value instanceof BigDecimal bd) {
      return bd;
    }
    if (value instanceof Number num) {
      return new BigDecimal(num.toString());
    }
    String s = value.toString().trim();
    if (s.isEmpty()) return null;
    return new BigDecimal(s);
  }

  private Timestamp convertToTimestamp(Object value) {
    if (value instanceof Timestamp ts) {
      return ts;
    }
    if (value instanceof LocalDateTime ldt) {
      return Timestamp.valueOf(ldt);
    }
    if (value instanceof Instant instant) {
      return Timestamp.from(instant);
    }
    String s = value.toString().trim();
    if (s.isEmpty()) return null;
    try {
      return Timestamp.from(Instant.parse(s));
    } catch (DateTimeParseException ignored) { }
    try {
      return Timestamp.valueOf(LocalDateTime.parse(s));
    } catch (DateTimeParseException ignored) { }
    try {
      LocalDate date = LocalDate.parse(s);
      return Timestamp.valueOf(date.atStartOfDay());
    } catch (DateTimeParseException ignored) { }
    throw new IllegalArgumentException("Cannot convert value '" + value + "' to timestamp");
  }

  private Date convertToDate(Object value) {
    if (value instanceof Date date) {
      return date;
    }
    if (value instanceof LocalDate localDate) {
      return Date.valueOf(localDate);
    }
    if (value instanceof Instant instant) {
      return Date.valueOf(LocalDateTime.ofInstant(instant, ZoneId.systemDefault()).toLocalDate());
    }
    String s = value.toString().trim();
    if (s.isEmpty()) return null;
    try {
      return Date.valueOf(LocalDate.parse(s));
    } catch (DateTimeParseException ignored) { }
    try {
      Instant instant = Instant.parse(s);
      return Date.valueOf(LocalDateTime.ofInstant(instant, ZoneId.systemDefault()).toLocalDate());
    } catch (DateTimeParseException ignored) { }
    throw new IllegalArgumentException("Cannot convert value '" + value + "' to date");
  }
}
