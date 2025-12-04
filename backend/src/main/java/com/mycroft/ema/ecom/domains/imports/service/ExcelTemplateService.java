package com.mycroft.ema.ecom.domains.imports.service;

import com.mycroft.ema.ecom.common.files.MinioProperties;
import com.mycroft.ema.ecom.domains.imports.dto.ColumnInfo;
import com.mycroft.ema.ecom.domains.imports.dto.TemplateAnalysisResponse;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.Instant;
import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeFormatterBuilder;
import java.time.format.DateTimeParseException;

/**
 * Analyzes Excel and CSV templates to infer column definitions, generate DDL and populate component tables.
 */
@Service
public class ExcelTemplateService {

  private static final int SAMPLE_ROWS = 100;
  private static final Pattern SNAKE_CASE_NON_ALNUM = Pattern.compile("[^a-z0-9_]");
  private static final DateTimeFormatter FLEXIBLE_MDY_SLASH = new DateTimeFormatterBuilder()
      .parseCaseInsensitive()
      .parseLenient()
      .appendPattern("M/d/uuuu HH:mm:ss")
      .toFormatter(Locale.US);
  private static final DateTimeFormatter FLEXIBLE_MDY_DASH = new DateTimeFormatterBuilder()
      .parseCaseInsensitive()
      .parseLenient()
      .appendPattern("M-d-uuuu HH:mm:ss")
      .toFormatter(Locale.US);
  private static final DateTimeFormatter[] FLEXIBLE_DATE_TIME_FORMATS = new DateTimeFormatter[]{
      DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"),
      DateTimeFormatter.ofPattern("yyyy/MM/dd HH:mm:ss"),
      DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss"),
      DateTimeFormatter.ofPattern("dd-MM/yyyy HH:mm:ss"),
      DateTimeFormatter.ofPattern("MM/dd/yyyy HH:mm:ss"),
      DateTimeFormatter.ofPattern("MM-dd-yyyy HH:mm:ss"),
      FLEXIBLE_MDY_SLASH,
      FLEXIBLE_MDY_DASH
  };
  private final JdbcTemplate jdbcTemplate;
  private final MinioProperties minioProperties;

  public ExcelTemplateService(JdbcTemplate jdbcTemplate, MinioProperties minioProperties) {
    this.jdbcTemplate = jdbcTemplate;
    this.minioProperties = minioProperties;
  }

  private ColumnInfo createColumnInfo(String excelName, String normalizedName, String logicalType,
                                      String sqlType, boolean nullable, String sampleValue) {
    ColumnInfo info = new ColumnInfo(excelName, normalizedName, logicalType, sqlType, nullable, sampleValue);
    if ("MINIO_IMAGE".equalsIgnoreCase(logicalType)) {
      info.setSemanticType("MINIO:IMAGE");
      Map<String, Object> metadata = new LinkedHashMap<>();
      if (minioProperties != null) {
        metadata.put("maxImages", minioProperties.getDefaultMaxImages());
        metadata.put("maxFileSizeBytes", minioProperties.getMaxImageSizeBytes());
        metadata.put("allowedMimeTypes", minioProperties.getAllowedImageMimeTypes());
      } else {
        metadata.put("maxImages", 1);
      }
      info.setMetadata(metadata);
    }
    return info;
  }

  private ColumnInfo createIdColumnInfo(String excelName, String sampleValue) {
    return new ColumnInfo(excelName, "id", "STRING", "UUID", false, sampleValue);
  }

  private void collectCsvRows(MultipartFile file, List<ColumnInfo> columns, boolean typeRowProvided,
                              List<Object[]> batch, List<String> warnings) {
    try (InputStream is = file.getInputStream();
         BufferedReader br = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {
      String line;
      int rowIndex = 0;
      while ((line = br.readLine()) != null) {
        List<String> values = parseCsvLine(line);
        if (rowIndex == 0) { // header
          rowIndex++;
          continue;
        }
        if (typeRowProvided && rowIndex == 1) { // types row
          rowIndex++;
          continue;
        }
        Object[] params = new Object[columns.size()];
        boolean allBlank = true;
        for (int c = 0; c < columns.size(); c++) {
          String raw = values.size() > c ? values.get(c) : null;
          ColumnInfo column = columns.get(c);
          Object converted = convertCellValue(raw, column.getInferredType(), warnings,
              column.getExcelName(), rowIndex + 1);
          if (!isNullOrBlank(converted)) {
            allBlank = false;
          }
          params[c] = converted;
        }
        if (!allBlank) {
          batch.add(params);
        }
        rowIndex++;
      }
    } catch (Exception e) {
      throw new RuntimeException("Failed to read CSV content: " + e.getMessage(), e);
    }
  }

  private void collectExcelRows(MultipartFile file, List<ColumnInfo> columns, boolean typeRowProvided,
                                List<Object[]> batch, List<String> warnings) {
    try (InputStream is = file.getInputStream(); Workbook wb = WorkbookFactory.create(is)) {
      Sheet sheet = wb.getNumberOfSheets() > 0 ? wb.getSheetAt(0) : null;
      if (sheet == null) {
        return;
      }
      int firstRow = sheet.getFirstRowNum();
      int dataStart = firstRow + 1 + (typeRowProvided ? 1 : 0);
      for (int r = dataStart; r <= sheet.getLastRowNum(); r++) {
        Row row = sheet.getRow(r);
        if (row == null) {
          continue;
        }
        Object[] params = new Object[columns.size()];
        boolean allBlank = true;
        for (int c = 0; c < columns.size(); c++) {
          ColumnInfo column = columns.get(c);
          Cell cell = row.getCell(c);
          Object raw = cell == null ? null : getCellValue(cell);
          Object converted = convertCellValue(raw, column.getInferredType(), warnings,
              column.getExcelName(), r + 1);
          if (!isNullOrBlank(converted)) {
            allBlank = false;
          }
          params[c] = converted;
        }
        if (!allBlank) {
          batch.add(params);
        }
      }
    } catch (Exception e) {
      throw new RuntimeException("Failed to read Excel content: " + e.getMessage(), e);
    }
  }

  private Object convertCellValue(Object rawValue, String logicalType, List<String> warnings,
                                  String columnName, int rowNumber) {
    if (rawValue == null) {
      return null;
    }
    Object value = rawValue;
    if (value instanceof String s) {
      String trimmed = s.trim();
      if (trimmed.isEmpty()) {
        return null;
      }
      value = trimmed;
    }

    String type = logicalType == null ? "STRING" : logicalType.toUpperCase(Locale.ROOT);
    try {
      return switch (type) {
        case "INTEGER" -> toLong(value);
        case "DECIMAL" -> toBigDecimal(value);
        case "BOOLEAN" -> toBoolean(value);
        case "DATE" -> convertToDate(value, columnName, rowNumber, warnings);
        case "MINIO_IMAGE" -> value.toString();
        default -> value instanceof String ? value : value.toString();
      };
    } catch (Exception ex) {
      if (warnings != null) {
        warnings.add("Row " + rowNumber + ", column '" + columnName + "': failed to convert value '" +
            value + "' to " + type + ". Stored as text.");
      }
      return value instanceof String ? value : value.toString();
    }
  }

  private Long toLong(Object value) {
    if (value instanceof Number num) {
      return num.longValue();
    }
    return Long.parseLong(value.toString());
  }

  private BigDecimal toBigDecimal(Object value) {
    if (value instanceof BigDecimal bd) {
      return bd;
    }
    if (value instanceof Number num) {
      return new BigDecimal(num.toString());
    }
    String str = value.toString().trim();
    if (str.isEmpty()) {
      return null;
    }
    // normalize localized decimal separators (e.g., "1,25" -> "1.25")
    if (str.indexOf(',') >= 0 && str.indexOf('.') < 0) {
      str = str.replace(',', '.');
    }
    // remove grouping spaces or non-breaking spaces
    str = str.replace("\u00A0", "").replace(" ", "");
    return new BigDecimal(str);
  }

  private Boolean toBoolean(Object value) {
    if (value instanceof Boolean b) {
      return b;
    }
    if (value instanceof Number num) {
      return num.intValue() != 0;
    }
    String s = value.toString().trim().toLowerCase(Locale.ROOT);
    if (s.isEmpty()) {
      return null;
    }
    if (Set.of("true", "t", "yes", "y", "1").contains(s)) {
      return Boolean.TRUE;
    }
    if (Set.of("false", "f", "no", "n", "0").contains(s)) {
      return Boolean.FALSE;
    }
    return Boolean.parseBoolean(s);
  }

  private Object convertToDate(Object value, String columnName, int rowNumber, List<String> warnings) {
    if (value instanceof LocalDateTime ldt) {
      return ldt;
    }
    if (value instanceof LocalDate ld) {
      return ld.atStartOfDay();
    }
    if (value instanceof Date date) {
      return LocalDateTime.ofInstant(date.toInstant(), ZoneId.systemDefault());
    }
    if (value instanceof Instant instant) {
      return LocalDateTime.ofInstant(instant, ZoneId.systemDefault());
    }
    if (value instanceof Number num) {
      try {
        Instant instant = Instant.ofEpochMilli(num.longValue());
        return LocalDateTime.ofInstant(instant, ZoneId.systemDefault());
      } catch (Exception ex) {
        if (warnings != null) {
          warnings.add("Row " + rowNumber + ", column '" + columnName + "': numeric date '" + value
              + "' could not be converted. Stored as text.");
        }
        return value.toString();
      }
    }
    String s = value.toString().trim();
    if (s.isEmpty()) {
      return null;
    }
    try {
      return LocalDateTime.parse(s);
    } catch (DateTimeParseException ignored) {}
    try {
      return OffsetDateTime.parse(s).toLocalDateTime();
    } catch (DateTimeParseException ignored) {}
    try {
      return Instant.parse(s).atZone(ZoneId.systemDefault()).toLocalDateTime();
    } catch (DateTimeParseException ignored) {}
    try {
      return LocalDate.parse(s).atStartOfDay();
    } catch (DateTimeParseException ignored) {}
    for (DateTimeFormatter formatter : FLEXIBLE_DATE_TIME_FORMATS) {
      try {
        return LocalDateTime.parse(s, formatter);
      } catch (DateTimeParseException ignored) {}
    }
    try {
      double numeric = Double.parseDouble(s);
      return LocalDateTime.ofInstant(excelSerialToInstant(numeric), ZoneId.systemDefault());
    } catch (NumberFormatException ignored) {}
    if (warnings != null) {
      warnings.add("Row " + rowNumber + ", column '" + columnName + "': unable to parse date value '" +
          s + "'. Stored as text.");
    }
    return s;
  }

  private static Instant excelSerialToInstant(double serial) {
    double adjusted = serial > 59 ? serial - 1 : serial;
    LocalDate baseDate = LocalDate.of(1899, 12, 30);
    int wholeDays = (int) Math.floor(adjusted);
    double fractionalDay = adjusted - wholeDays;
    long seconds = Math.round(fractionalDay * 24 * 60 * 60);
    LocalDate date = baseDate.plusDays(wholeDays);
    return date.atStartOfDay(ZoneId.systemDefault()).toInstant().plusSeconds(seconds);
  }

  private boolean isNullOrBlank(Object value) {
    if (value == null) {
      return true;
    }
    if (value instanceof String s) {
      return s.isBlank();
    }
    return false;
  }

  public TemplateAnalysisResponse analyzeTemplate(MultipartFile file, String tableName) {
    var warnings = new ArrayList<String>();
    String filename = Optional.ofNullable(file.getOriginalFilename()).orElse("");
    String contentType = Optional.ofNullable(file.getContentType()).orElse("");
    boolean isCsv = filename.toLowerCase(Locale.ROOT).endsWith(".csv")
        || "text/csv".equalsIgnoreCase(contentType)
        || "application/csv".equalsIgnoreCase(contentType);

    try {
      if (isCsv) {
        // CSV branch: parse first row as headers, optional second row as type markers
        try (InputStream is = file.getInputStream();
             BufferedReader br = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {
          List<List<String>> rows = readCsv(br, SAMPLE_ROWS + 2);
          if (rows.isEmpty()) {
            throw new IllegalArgumentException("The CSV file is empty");
          }

          // Headers
          List<String> rawHeaders = rows.get(0);
          List<String> headers = new ArrayList<>();
          for (int c = 0; c < rawHeaders.size(); c++) {
            String h = rawHeaders.get(c) == null ? null : rawHeaders.get(c).trim();
            if (h == null || h.isBlank()) {
              headers.add("col_" + c);
              warnings.add("Empty header at column index " + c + ", using default name col_" + c);
            } else {
              headers.add(h);
            }
          }

          List<ColumnInfo> columns = new ArrayList<>();
          Map<String, String> inferred = new LinkedHashMap<>();
          Map<String, String> samples = new HashMap<>();
          Map<String, Boolean> nullable = new HashMap<>();

          // Optional types row
          List<String> typesRow = rows.size() > 1 ? rows.get(1) : null;
          boolean looksLikeTypes = typesRow != null && !typesRow.isEmpty();
          List<String> providedTypes = new ArrayList<>();
          if (looksLikeTypes) {
            for (int c = 0; c < headers.size(); c++) {
              String csvHeader = headers.get(c);
              String csvNorm = normalize(csvHeader);
              String v = (typesRow.size() > c) ? Optional.ofNullable(typesRow.get(c)).orElse("").trim() : "";
              if ("id".equals(csvNorm)) {
                v = "uuid"; // always treat id column as UUID marker
              }
              if (v.isBlank()) { 
                looksLikeTypes = false; 
                break; 
              }
              if (!isSupportedTypeMarker(v)) { 
                warnings.add(getUnsupportedTypeErrorMessage(v, csvHeader, c));
                looksLikeTypes = false; 
                break; 
              }
              providedTypes.add(v);
            }
          }

          if (looksLikeTypes) {
            for (int i = 0; i < headers.size(); i++) {
              String headerName = headers.get(i);
              String norm = normalize(headerName);
              if ("id".equals(norm)) {
                columns.add(createIdColumnInfo(headerName, null));
                continue;
              }
              String marker = providedTypes.get(i);
              String logical = logicalTypeFor(marker);
              String sql = sqlTypeFor(logical);
              columns.add(createColumnInfo(headerName, norm, logical, sql, true, null));
            }
            String normalizedTable = normalize(tableName);
            String ddl = buildCreateTable(normalizedTable, columns);
            return new TemplateAnalysisResponse(normalizedTable, columns, ddl, warnings, true);
          }

          // Inference from data rows
          for (int i = 0; i < headers.size(); i++) {
            inferred.put(headers.get(i), "UNKNOWN");
            nullable.put(headers.get(i), Boolean.FALSE);
          }
          int startData = 1; // row index after header (no types row)
          int maxRow = Math.min(rows.size() - 1, SAMPLE_ROWS);
          for (int r = startData; r <= maxRow; r++) {
            List<String> row = rows.get(r);
            if (row == null) continue;
            for (int c = 0; c < headers.size(); c++) {
              String head = headers.get(c);
              String val = (row.size() > c) ? row.get(c) : null;
              if (val == null || val.isBlank()) { nullable.put(head, Boolean.TRUE); continue; }
              if (!samples.containsKey(head)) samples.put(head, val);
              String cur = inferred.get(head);
              String now = typeOf(val);
              inferred.put(head, mergeTypes(cur, now));
            }
          }

          for (String h : headers) {
            String norm = normalize(h);
            if ("id".equals(norm)) {
              columns.add(createIdColumnInfo(h, samples.get(h)));
              continue;
            }
            String inferredType = inferred.getOrDefault(h, "UNKNOWN");
            if ("UNKNOWN".equals(inferredType)) {
              inferredType = "STRING";
              warnings.add("Column '" + h + "' has unknown type; defaulting to STRING");
            }
            String sqlType = sqlTypeFor(inferredType);
            boolean isNullable = nullable.getOrDefault(h, Boolean.TRUE);
            columns.add(createColumnInfo(h, norm, inferredType, sqlType, isNullable, samples.get(h)));
          }

          String normalizedTable = normalize(tableName);
          String ddl = buildCreateTable(normalizedTable, columns);
          return new TemplateAnalysisResponse(normalizedTable, columns, ddl, warnings, false);
        }
      } else {
        // Excel branch (existing)
        try (InputStream is = file.getInputStream()) {
          Workbook wb = WorkbookFactory.create(is);
          Sheet sheet = wb.getNumberOfSheets() > 0 ? wb.getSheetAt(0) : null;
          if (sheet == null) {
            throw new IllegalArgumentException("The Excel file has no sheets");
          }
          Row header = sheet.getRow(sheet.getFirstRowNum());
          if (header == null) {
            throw new IllegalArgumentException("The first row must contain headers");
          }

          List<String> headers = new ArrayList<>();
          for (int c = header.getFirstCellNum(); c < header.getLastCellNum(); c++) {
            Cell cell = header.getCell(c);
            String h = cell != null ? cell.toString().trim() : null;
            if (h == null || h.isBlank()) {
              headers.add("col_" + c);
              warnings.add("Empty header at column index " + c + ", using default name col_" + c);
            } else {
              headers.add(h);
            }
          }

          List<ColumnInfo> columns = new ArrayList<>();
          Map<String, String> inferred = new LinkedHashMap<>();
          Map<String, String> samples = new HashMap<>();
          Map<String, Boolean> nullable = new HashMap<>();

          int firstDataRow = sheet.getFirstRowNum() + 1;

          // Detect explicit types row (required by new architecture): if row 1 looks like types
          Row typesRow = sheet.getRow(firstDataRow);
          if (typesRow != null) {
            boolean looksLikeTypes2 = true;
            List<String> providedTypes = new ArrayList<>();
            for (int c = 0; c < headers.size(); c++) {
              Cell cell = typesRow.getCell(c);
              String excelHeader = headers.get(c);
              String excelNorm = normalize(excelHeader);
              String v = cell == null ? null : cell.toString().trim();
              if ("id".equals(excelNorm)) {
                v = "uuid";
              }
              if (v == null || v.isBlank()) { 
                looksLikeTypes2 = false; 
                break; 
              }
              providedTypes.add(v);
              if (!isSupportedTypeMarker(v)) {
                warnings.add(getUnsupportedTypeErrorMessage(v, excelHeader, c));
                looksLikeTypes2 = false; // if any not supported, fall back to inference
                break;
              }
            }
            if (looksLikeTypes2) {
              for (int i = 0; i < headers.size(); i++) {
                String headerName = headers.get(i);
                String norm = normalize(headerName);
                if ("id".equals(norm)) {
                  columns.add(createIdColumnInfo(headerName, null));
                  continue;
                }
                String marker = providedTypes.get(i);
                String logical = logicalTypeFor(marker);
                String sql = sqlTypeFor(logical);
                columns.add(createColumnInfo(headerName, norm, logical, sql, true, null));
              }
              String normalizedTable = normalize(tableName);
              String ddl = buildCreateTable(normalizedTable, columns);
              return new TemplateAnalysisResponse(normalizedTable, columns, ddl, warnings, true);
            }
          }

          // Fallback: infer types from sample data rows (legacy behavior)
          int lastRow = Math.min(sheet.getLastRowNum(), firstDataRow + SAMPLE_ROWS);
          for (int i = 0; i < headers.size(); i++) {
            inferred.put(headers.get(i), "UNKNOWN");
            nullable.put(headers.get(i), Boolean.FALSE);
          }

          for (int r = firstDataRow; r <= lastRow; r++) {
            Row row = sheet.getRow(r);
            if (row == null) continue;
            for (int c = 0; c < headers.size(); c++) {
              Cell cell = row.getCell(c);
              String head = headers.get(c);
              if (cell == null || cell.getCellType() == CellType.BLANK) {
                nullable.put(head, Boolean.TRUE);
                continue;
              }
              Object val = getCellValue(cell);
              if (val == null) {
                nullable.put(head, Boolean.TRUE);
                continue;
              }
              if (!samples.containsKey(head)) samples.put(head, val.toString());
              String cur = inferred.get(head);
              String now = typeOf(val);
              inferred.put(head, mergeTypes(cur, now));
            }
          }

          for (String h : headers) {
            String norm = normalize(h);
            if ("id".equals(norm)) {
              columns.add(createIdColumnInfo(h, samples.get(h)));
              continue;
            }
            String inferredType = inferred.getOrDefault(h, "UNKNOWN");
            if ("UNKNOWN".equals(inferredType)) {
              inferredType = "STRING"; // fallback
              warnings.add("Column '" + h + "' has unknown type; defaulting to STRING");
            }
            String sqlType = sqlTypeFor(inferredType);
            boolean isNullable = nullable.getOrDefault(h, Boolean.TRUE);
            columns.add(createColumnInfo(h, norm, inferredType, sqlType, isNullable, samples.get(h)));
          }

          String normalizedTable = normalize(tableName);
          String ddl = buildCreateTable(normalizedTable, columns);
          return new TemplateAnalysisResponse(normalizedTable, columns, ddl, warnings, false);
        }
      }
    } catch (IllegalArgumentException e) {
      // For known validation errors, pass through the message
      throw new RuntimeException("Template validation error: " + e.getMessage(), e);
    } catch (Exception e) {
      // For unexpected errors, provide a more generic message
      throw new RuntimeException("Failed to analyze template: " + e.getMessage() + 
          ". Please check that your template follows the required format with headers in row 1 and optional type markers in row 2.", e);
    }
  }

  public int populateData(MultipartFile file, TemplateAnalysisResponse analysis) {
    if (file == null) {
      throw new IllegalArgumentException("File is required to populate data");
    }
    if (analysis == null) {
      throw new IllegalArgumentException("Template analysis is required to populate data");
    }

    List<ColumnInfo> columns = Optional.ofNullable(analysis.getColumns()).orElse(Collections.emptyList());
    if (columns.isEmpty()) {
      return 0; // Nothing to insert
    }

    String table = Optional.ofNullable(analysis.getTableName()).map(String::trim).orElse("");
    if (table.isEmpty()) {
      throw new IllegalArgumentException("Resolved table name is empty; cannot populate data");
    }

    List<String> warnings = analysis.getWarnings();
    if (warnings == null) {
      warnings = new ArrayList<>();
      analysis.setWarnings(warnings);
    }

    String filename = Optional.ofNullable(file.getOriginalFilename()).orElse("");
    String contentType = Optional.ofNullable(file.getContentType()).orElse("");
    boolean isCsv = filename.toLowerCase(Locale.ROOT).endsWith(".csv")
        || "text/csv".equalsIgnoreCase(contentType)
        || "application/csv".equalsIgnoreCase(contentType);

    List<Object[]> rawBatch = new ArrayList<>();
    if (isCsv) {
      collectCsvRows(file, columns, analysis.isTypeRowProvided(), rawBatch, warnings);
    } else {
      collectExcelRows(file, columns, analysis.isTypeRowProvided(), rawBatch, warnings);
    }

    if (rawBatch.isEmpty()) {
      return 0;
    }

    List<Object[]> batch = new ArrayList<>(rawBatch.size());
    boolean hasIdColumn = columns.stream().anyMatch(c -> "id".equalsIgnoreCase(c.getName()));
    List<String> columnNames = columns.stream().map(ColumnInfo::getName).collect(Collectors.toList());
    String columnList = String.join(", ", columnNames);
    String placeholders = columns.stream().map(c -> "?").collect(Collectors.joining(", "));
    String sql = "INSERT INTO " + table + " (" + columnList + ") VALUES (" + placeholders + ")";

    Set<UUID> existingIds = new HashSet<>();
    boolean dedupeIds = hasIdColumn && "orders_config".equalsIgnoreCase(table);
    if (dedupeIds) {
      existingIds.addAll(fetchExistingIds(table));
    }
    Set<UUID> usedIds = new HashSet<>(existingIds);

    for (Object[] row : rawBatch) {
      Object[] filtered = Arrays.copyOf(row, row.length);
      if (hasIdColumn) {
        int idIndex = findColumnIndex(columns, "id");
        Object idValue = idIndex >= 0 ? filtered[idIndex] : null;
        UUID sanitized = sanitizeImportedId(idValue, warnings);
        if (dedupeIds && sanitized != null) {
          if (usedIds.contains(sanitized)) {
            UUID regenerated = UUID.randomUUID();
            warnings.add("Duplicate id detected (" + sanitized + "); generated new id " + regenerated + ".");
            sanitized = regenerated;
          }
          usedIds.add(sanitized);
        }
        filtered[idIndex] = sanitized;
      }
      batch.add(filtered);
    }

    try {
      int[] result = jdbcTemplate.batchUpdate(sql, batch);
      int inserted = 0;
      if (result != null) {
        for (int count : result) {
          if (count > 0) {
            inserted += count;
          }
        }
      }
      return inserted;
    } catch (Exception e) {
      String rootMessage = e.getMessage();
      if (e instanceof org.springframework.dao.DataAccessException dae && dae.getMostSpecificCause() != null) {
        rootMessage = dae.getMostSpecificCause().getMessage();
      }
      throw new RuntimeException("Failed to insert data into table '" + table + "': " + rootMessage, e);
    }
  }

  private int findColumnIndex(List<ColumnInfo> columns, String targetName) {
    for (int i = 0; i < columns.size(); i++) {
      if (targetName.equalsIgnoreCase(columns.get(i).getName())) {
        return i;
      }
    }
    return -1;
  }

  private UUID sanitizeImportedId(Object rawId, List<String> warnings) {
    if (rawId == null) {
      UUID generated = UUID.randomUUID();
      warnings.add("Missing id detected in template import. Generated UUID " + generated + ".");
      return generated;
    }
    String trimmed = rawId.toString().trim();
    if (trimmed.isEmpty()) {
      UUID generated = UUID.randomUUID();
      warnings.add("Blank id detected in template import. Generated UUID " + generated + ".");
      return generated;
    }
    try {
      return UUID.fromString(trimmed);
    } catch (IllegalArgumentException ex) {
      UUID generated = UUID.randomUUID();
      warnings.add("Invalid UUID '" + trimmed + "' detected in template import. Generated UUID " + generated + ".");
      return generated;
    }
  }

  private Set<UUID> fetchExistingIds(String table) {
    try {
      return new HashSet<>(jdbcTemplate.query(
          "select id from " + table,
          (rs, rowNum) -> rs.getObject("id", UUID.class)
      ));
    } catch (Exception ex) {
      return Set.of();
    }
  }

  public byte[] generateExampleTemplate(String type){
    List<String> headers;
    List<String> types;
    String t = type == null ? "generic" : type.trim().toLowerCase(Locale.ROOT);
    switch (t){
      case "product" -> {
        headers = List.of("id", "product_image","product_name","product_variant","product_link","sku","selling_price","available_stock","cost_of_goods","low_stock_threshold");
        types = List.of("uuid","minio:image","text","text","text","text","numeric(12,2)","bigint","numeric(12,2)","bigint");
      }
      case "order", "orders" -> {
        headers = List.of("id", "order_number","order_reference","customer_name","customer_phone","status","assigned_agent","store_name","city_confirmed","total_price","created_at","product_summary","notes");
        types = List.of("uuid","bigint","text","text","text","text","text","text","text","numeric(12,2)","timestamp","text","text");
      }
      case "ad", "ads", "advertising", "marketing" -> {
        headers = List.of("id", "spend_date","product_reference","platform","campaign_name","ad_spend","confirmed_orders","notes");
        types = List.of("uuid","date","text","text","text","numeric(12,2)","bigint","text");
      }
      default -> {
        headers = List.of("id", "external_id","name","description","quantity","unit_price","active","created_at");
        types = List.of("uuid","text","text","text","bigint","numeric(19,2)","boolean","timestamp");
      }
    }
    try(Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream bos = new ByteArrayOutputStream()){
      Sheet sheet = wb.createSheet("Template");
      Row header = sheet.createRow(0);
      for(int i=0;i<headers.size();i++){
        Cell cell = header.createCell(i, CellType.STRING);
        cell.setCellValue(headers.get(i));
        sheet.autoSizeColumn(i);
      }
      // types row (required by new architecture)
      Row typeRow = sheet.createRow(1);
      for(int i=0;i<types.size();i++){
        typeRow.createCell(i, CellType.STRING).setCellValue(types.get(i));
      }
      wb.write(bos);
      return bos.toByteArray();
    }catch (Exception e){
      throw new RuntimeException("Failed to generate example template: "+e.getMessage(), e);
    }
  }

  private boolean isSupportedTypeMarker(String raw){
    if(raw == null) return false;
    String s = raw.trim().toLowerCase(Locale.ROOT);
    // Accept common postgres types and minio markers; also accept numeric(x,y) and generic markers (integer, decimal, minio_image)
    if(s.startsWith("numeric(") && s.endsWith(")")) return true;
    return Set.of(
        "text","varchar","varchar(255)","bigint","uuid","timestamp","date","boolean",
        "integer","decimal",
        "minio:image","minio:file","minio_image","minio_file"
    ).contains(s);
  }

  private String getUnsupportedTypeErrorMessage(String type, String columnName, int columnIndex) {
    StringBuilder message = new StringBuilder();
    message.append("Unsupported type '").append(type).append("' for column '").append(columnName)
           .append("' at index ").append(columnIndex).append(". ");

    message.append("Supported types are: text, varchar, varchar(255), bigint, uuid, timestamp, date, boolean, ")
           .append("integer, decimal, numeric(x,y), minio:image, minio:file, minio_image, minio_file");

    return message.toString();
  }

  private String logicalTypeFor(String marker){
    String s = marker == null ? "" : marker.trim().toLowerCase(Locale.ROOT);
    if(s.startsWith("numeric(")) return "DECIMAL";
    return switch (s){
      case "bigint", "integer" -> "INTEGER";
      case "uuid" -> "STRING"; // stored as UUID but handled as string in UI
      case "timestamp", "date" -> "DATE";
      case "decimal" -> "DECIMAL";
      case "boolean" -> "BOOLEAN";
      case "minio:image", "minio:file", "minio_image", "minio_file" -> "MINIO_IMAGE";
      default -> "STRING"; // text/varchar
    };
  }

  private String normalize(String name){
    if(name == null) return "";
    String s = name.trim().toLowerCase(Locale.ROOT)
        .replaceAll("[\u00A0\s]+", "_");
    s = SNAKE_CASE_NON_ALNUM.matcher(s).replaceAll("");
    if(s.isEmpty()) s = "col";
    if(Character.isDigit(s.charAt(0))) s = "c_"+s;
    return s;
  }

  private Object getCellValue(Cell cell){
    return switch (cell.getCellType()){
      case STRING -> cell.getStringCellValue();
      case NUMERIC -> {
        if(DateUtil.isCellDateFormatted(cell)){
          Date d = cell.getDateCellValue();
          yield LocalDate.ofInstant(d.toInstant(), ZoneId.systemDefault());
        }
        double n = cell.getNumericCellValue();
        if(n == Math.rint(n)) yield (long) n; // integer
        yield BigDecimal.valueOf(n);
      }
      case BOOLEAN -> cell.getBooleanCellValue();
      case FORMULA -> {
        try{
          FormulaEvaluator ev = cell.getSheet().getWorkbook().getCreationHelper().createFormulaEvaluator();
          CellValue cv = ev.evaluate(cell);
          yield switch (cv.getCellType()){
            case STRING -> cv.getStringValue();
            case NUMERIC -> {
              if(DateUtil.isCellDateFormatted(cell)){
                Date d = cell.getDateCellValue();
                yield LocalDate.ofInstant(d.toInstant(), ZoneId.systemDefault());
              }
              double n = cv.getNumberValue();
              if(n == Math.rint(n)) yield (long) n; else yield BigDecimal.valueOf(n);
            }
            case BOOLEAN -> cv.getBooleanValue();
            default -> null;
          };
        }catch (Exception ex){
          yield null;
        }
      }
      default -> null;
    };
  }

  private String typeOf(Object val){
    if(val instanceof Boolean) return "BOOLEAN";
    if(val instanceof LocalDate) return "DATE";
    if(val instanceof Long || val instanceof Integer) return "INTEGER";
    if(val instanceof BigDecimal || val instanceof Double || val instanceof Float) return "DECIMAL";
    // try to coerce string
    if(val instanceof String s){
      if(s.isBlank()) return "STRING";
      try{ Long.parseLong(s); return "INTEGER"; }catch (Exception ignored){}
      try{ new BigDecimal(s); return "DECIMAL"; }catch (Exception ignored){}
      try{ LocalDate.parse(s); return "DATE"; }catch (Exception ignored){}
      if("true".equalsIgnoreCase(s) || "false".equalsIgnoreCase(s)) return "BOOLEAN";
      return "STRING";
    }
    return "STRING";
  }

  private String mergeTypes(String a, String b){
    if(a == null || "UNKNOWN".equals(a)) return b;
    if(b == null || "UNKNOWN".equals(b)) return a;
    if(a.equals(b)) return a;
    // if conflict, widen to STRING except DECIMAL+INTEGER -> DECIMAL, DATE+STRING -> STRING
    if((a.equals("DECIMAL") && b.equals("INTEGER")) || (a.equals("INTEGER") && b.equals("DECIMAL"))) return "DECIMAL";
    return "STRING";
  }

  private String sqlTypeFor(String inferred){
    return switch (inferred){
      case "INTEGER" -> "BIGINT";
      case "DECIMAL" -> "NUMERIC(19,2)";
      case "DATE" -> "TIMESTAMP";
      case "BOOLEAN" -> "BOOLEAN";
      case "MINIO_IMAGE" -> "VARCHAR(1024)"; // store public URL or object key
      default -> "VARCHAR(255)";
    };
  }

  private String buildCreateTable(String table, List<ColumnInfo> cols){
    StringBuilder sb = new StringBuilder();
    sb.append("CREATE TABLE IF NOT EXISTS ").append(table).append(" (\n");
    sb.append("  id UUID PRIMARY KEY DEFAULT gen_random_uuid()");
    List<ColumnInfo> others = cols.stream()
        .filter(c -> !"id".equalsIgnoreCase(c.getName()))
        .toList();
    for (ColumnInfo c : others) {
      sb.append(",\n  ").append(c.getName()).append(" ").append(c.getSqlType());
      if(!c.isNullable()) sb.append(" NOT NULL");
    }
    sb.append("\n);");
    return sb.toString();
  }

  // --- CSV helpers ---
  private List<String> parseCsvLine(String line) {
    List<String> out = new ArrayList<>();
    if (line == null) return out;
    StringBuilder cur = new StringBuilder();
    boolean inQuotes = false;
    for (int i = 0; i < line.length(); i++) {
      char ch = line.charAt(i);
      if (ch == '"') {
        if (inQuotes && i + 1 < line.length() && line.charAt(i + 1) == '"') {
          // Escaped quote
          cur.append('"');
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch == ',' && !inQuotes) {
        out.add(cur.toString());
        cur.setLength(0);
      } else {
        cur.append(ch);
      }
    }
    out.add(cur.toString());
    return out;
  }

  private List<List<String>> readCsv(BufferedReader br, int maxRows) throws java.io.IOException {
    List<List<String>> rows = new ArrayList<>();
    String line;
    int count = 0;
    while ((line = br.readLine()) != null) {
      rows.add(parseCsvLine(line));
      count++;
      if (count >= maxRows) break;
    }
    return rows;
  }
}
