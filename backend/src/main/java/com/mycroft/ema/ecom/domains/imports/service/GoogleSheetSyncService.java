package com.mycroft.ema.ecom.domains.imports.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mycroft.ema.ecom.domains.imports.domain.GoogleImportConfig;
import com.mycroft.ema.ecom.domains.imports.dto.GoogleSheetSyncRequest;
import com.mycroft.ema.ecom.domains.imports.repo.GoogleImportConfigRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.EmptyResultDataAccessException;
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
import java.util.regex.Pattern;
@Slf4j
@Service
public class GoogleSheetSyncService {


  private final GoogleImportConfigRepository configRepository;
  private final DomainImportService domainImportService;
  private final JdbcTemplate jdbcTemplate;
  private final HybridUpsertBroadcaster upsertBroadcaster;
  private final com.mycroft.ema.ecom.domains.notifications.service.NotificationLogService notificationLogService;

  private static final Pattern JSON_PATTERN = Pattern.compile("^\\s*\\{.+}\\s*$", Pattern.DOTALL);
  private static final ObjectMapper JSON_MAPPER = new ObjectMapper();

  public GoogleSheetSyncService(GoogleImportConfigRepository configRepository,
                                DomainImportService domainImportService,
                                JdbcTemplate jdbcTemplate,
                                HybridUpsertBroadcaster upsertBroadcaster,
                                com.mycroft.ema.ecom.domains.notifications.service.NotificationLogService notificationLogService) {
    this.configRepository = configRepository;
    this.domainImportService = domainImportService;
    this.jdbcTemplate = jdbcTemplate;
    this.upsertBroadcaster = upsertBroadcaster;
    this.notificationLogService = notificationLogService;
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
    handleMinioPayloads(sanitizedRow);
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
      Map<String, Object> previousRow = fetchRow(table, rowId);
      upsertRow(table, sanitizedRow);
      Map<String, Object> currentRow = fetchRow(table, rowId);
      if (currentRow == null) {
        log.warn("Unable to fetch row {} after upsert in {}", rowId, table);
        return;
      }
      log.debug("Row after upsert for id {}: {}", rowId, currentRow);

      boolean existed = previousRow != null;
      List<String> changedColumns = existed ? detectChangedColumns(previousRow, currentRow, sanitizedRow.keySet()) : List.of();
      String resolvedAction = existed ? "UPDATE" : "INSERT";

      var logEntry = notificationLogService.record(domain, resolvedAction, rowId, request.rowNumber(), changedColumns);

      HybridUpsertEvent event = new HybridUpsertEvent(
          domain,
          rowId,
          Instant.now(),
          resolvedAction,
          request.rowNumber(),
          changedColumns,
          logEntry.getId()
      );
      log.debug("Broadcasting upsert event: {}", event);
      upsertBroadcaster.broadcast(event);
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

  private void handleMinioPayloads(Map<String, Object> row) {
    if (row == null || row.isEmpty()) {
      return;
    }
    for (Map.Entry<String, Object> entry : row.entrySet()) {
      Object raw = entry.getValue();
      if (raw == null) {
        continue;
      }
      MinioImagePayload payload = MinioImagePayload.from(raw);
      if (payload == null) {
        continue;
      }
      if (payload.clearRequested()) {
        entry.setValue(null);
        continue;
      }
      String serialized = payload.existingJson();
      if (serialized != null) {
        entry.setValue(serialized);
        continue;
      }
      // Sheet-driven sync is not allowed to attach new media automatically; clear unexpected payloads.
      entry.setValue(null);
    }
  }

  private record MinioImagePayload(boolean clearRequested, String existingJson) {

    static MinioImagePayload from(Object raw) {
      if (raw == null) {
        return null;
      }
      if (raw instanceof String str) {
        return fromString(str);
      }
      if (raw instanceof Map<?,?> map) {
        return fromMap(map);
      }
      return null;
    }

    @SuppressWarnings("unchecked")
    private static MinioImagePayload fromMap(Map<?, ?> map) {
      if (map.isEmpty()) {
        return null;
      }
      Object typeObj = map.get("type");
      String type = typeObj == null ? null : typeObj.toString().trim().toUpperCase(Locale.ROOT);
      boolean looksLikeMinio = type != null && type.contains("MINIO") && type.contains("IMAGE");
      if (!looksLikeMinio) {
        return null;
      }

      boolean clear = getBoolean(map.get("clear")) || getBoolean(map.get("remove"));
      Object existing = map.get("existing") != null ? map.get("existing") : map.get("json");
      String existingJson = existing instanceof String ? existing.toString() : null;
      if (!clear && existingJson == null) {
        return null;
      }
      return new MinioImagePayload(clear, existingJson);
    }

    private static MinioImagePayload fromString(String value) {
      if (value == null) {
        return null;
      }
      String trimmed = value.trim();
      if (!JSON_PATTERN.matcher(trimmed).matches()) {
        return null;
      }
      return new MinioImagePayload(false, trimmed);
    }

    private static boolean getBoolean(Object value) {
      if (value instanceof Boolean b) {
        return b;
      }
      if (value instanceof Number n) {
        return n.intValue() != 0;
      }
      if (value != null) {
        String s = value.toString().trim().toLowerCase(Locale.ROOT);
        return s.equals("true") || s.equals("1") || s.equals("yes");
      }
      return false;
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
      jdbcTemplate.update(upsertSql, ordered.values().stream().map(GoogleSheetSyncService::toJdbcValue).toArray());
    } catch (Exception ex) {
      log.error("Failed to upsert row {} in {}: {}", id, table, ex.getMessage(), ex);
      throw ex;
    }
  }

  private static Object toJdbcValue(Object value) {
    if (value == null) {
      return null;
    }
    if (value instanceof Map<?, ?> map) {
      try {
        return JSON_MAPPER.writeValueAsString(map);
      } catch (JsonProcessingException e) {
        throw new IllegalArgumentException("Unable to serialize map column for sync", e);
      }
    }
    if (value instanceof Collection<?> col) {
      try {
        return JSON_MAPPER.writeValueAsString(col);
      } catch (JsonProcessingException e) {
        throw new IllegalArgumentException("Unable to serialize collection column for sync", e);
      }
    }
    return value;
  }

  private void deleteRow(String table, UUID rowId) {
    jdbcTemplate.update("DELETE FROM " + table + " WHERE id = ?", rowId);
  }

  private Map<String, Object> fetchRow(String table, UUID id) {
    try {
      return jdbcTemplate.queryForMap("select * from " + table + " where id = ?", id);
    } catch (EmptyResultDataAccessException ex) {
      return null;
    }
  }

  private List<String> detectChangedColumns(Map<String, Object> previousRow,
                                            Map<String, Object> currentRow,
                                            Set<String> keysToCheck) {
    if (previousRow == null || currentRow == null || keysToCheck == null) {
      return List.of();
    }
    List<String> changed = new ArrayList<>();
    for (String key : keysToCheck) {
      if ("id".equalsIgnoreCase(key)) {
        continue;
      }
      Object previous = previousRow.get(key);
      Object current = currentRow.get(key);
      if (!Objects.equals(normalizeForComparison(previous), normalizeForComparison(current))) {
        changed.add(key);
      }
    }
    return changed;
  }

  private Object normalizeForComparison(Object value) {
    if (value == null) return null;
    if (value instanceof Timestamp ts) {
      return ts.toInstant();
    }
    if (value instanceof Date date) {
      return date.toLocalDate();
    }
    if (value instanceof BigDecimal bd) {
      return bd.stripTrailingZeros();
    }
    return value;
  }

}
