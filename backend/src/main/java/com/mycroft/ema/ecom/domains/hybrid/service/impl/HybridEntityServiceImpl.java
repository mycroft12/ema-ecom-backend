package com.mycroft.ema.ecom.domains.hybrid.service.impl;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mycroft.ema.ecom.auth.domain.User;
import com.mycroft.ema.ecom.auth.service.CurrentUserService;
import com.mycroft.ema.ecom.common.error.BadRequestException;
import com.mycroft.ema.ecom.common.error.NotFoundException;
import com.mycroft.ema.ecom.common.files.MinioFileStorageService;
import com.mycroft.ema.ecom.common.files.MinioImagePayload;
import com.mycroft.ema.ecom.common.files.MinioProperties;
import com.mycroft.ema.ecom.common.metadata.ColumnSemantics;
import com.mycroft.ema.ecom.common.metadata.ColumnSemanticsService;
import com.mycroft.ema.ecom.domains.hybrid.dto.HybridCreateDto;
import com.mycroft.ema.ecom.domains.hybrid.dto.HybridResponseDto;
import com.mycroft.ema.ecom.domains.hybrid.dto.HybridUpdateDto;
import com.mycroft.ema.ecom.domains.hybrid.dto.HybridViewDto;
import com.mycroft.ema.ecom.domains.hybrid.service.HybridEntityService;
import com.mycroft.ema.ecom.domains.imports.service.DomainImportService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.MultiValueMap;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.Locale;
import java.util.stream.Collectors;

/**
 * JDBC-backed implementation of {@link com.mycroft.ema.ecom.domains.hybrid.service.HybridEntityService}
 * that dynamically routes operations to configured domain tables while enforcing column semantics.
 */
@Service
@Transactional(readOnly = true)
public class HybridEntityServiceImpl implements HybridEntityService {

  private static final Logger log = LoggerFactory.getLogger(HybridEntityServiceImpl.class);

  private final JdbcTemplate jdbc;
  private final DomainImportService domainImportService;
  private final ColumnSemanticsService semanticsService;
  private final MinioFileStorageService minioStorage;
  private final MinioProperties minioProperties;
  private final CurrentUserService currentUserService;

  public HybridEntityServiceImpl(JdbcTemplate jdbc,
                                 DomainImportService domainImportService,
                                 ColumnSemanticsService semanticsService,
                                 ObjectProvider<MinioFileStorageService> minioProvider,
                                 MinioProperties minioProperties,
                                 CurrentUserService currentUserService) {
    this.jdbc = jdbc;
    this.domainImportService = domainImportService;
    this.semanticsService = semanticsService;
    this.minioStorage = minioProvider == null ? null : minioProvider.getIfAvailable();
    this.minioProperties = minioProperties;
    this.currentUserService = currentUserService;
  }

  @Override
  public Page<HybridViewDto> search(String entityType, String q, MultiValueMap<String, String> filters, Pageable pageable) {
    String table = ensureConfigured(entityType);
    Map<String, ColumnMeta> columnLookup = columnMetadata(table);
    List<String> searchableColumns = columnLookup.values().stream()
        .map(ColumnMeta::name)
        .filter(name -> name != null && !"id".equalsIgnoreCase(name))
        .toList();

    List<Object> filterArgs = new ArrayList<>();
    List<String> whereParts = new ArrayList<>();

    String trimmedQuery = q == null ? null : q.trim();
    if (StringUtils.hasText(trimmedQuery) && !searchableColumns.isEmpty()) {
      String clause = searchableColumns.stream()
          .map(col -> "lower(" + col + "::text) like ?")
          .collect(Collectors.joining(" OR "));
      whereParts.add("(" + clause + ")");
      String pattern = "%" + trimmedQuery.toLowerCase(Locale.ROOT) + "%";
      searchableColumns.forEach(col -> filterArgs.add(pattern));
    }

    List<FilterCriterion> criteria = extractFilterCriteria(filters);
    for (FilterCriterion criterion : criteria) {
      if (!StringUtils.hasText(criterion.field())) {
        continue;
      }
      ColumnMeta meta = columnLookup.get(criterion.field().toLowerCase(Locale.ROOT));
      if (meta == null || "id".equalsIgnoreCase(meta.name())) {
        continue;
      }
      Optional<String> clause = buildColumnFilterClause(table, meta, criterion, filterArgs);
      clause.ifPresent(whereParts::add);
    }

    applyOrderAgentRestriction(entityType, columnLookup, whereParts, filterArgs);

    String whereClause = whereParts.isEmpty() ? "" : " where " + String.join(" and ", whereParts);

    String countSql = "select count(*) from " + table + whereClause;
    Long totalCount = jdbc.queryForObject(countSql, filterArgs.toArray(), Long.class);
    long total = totalCount == null ? 0 : totalCount;

    int pageSize = pageable.getPageSize();
    int offset = (int) pageable.getOffset();

    List<Object> dataArgs = new ArrayList<>(filterArgs);
    dataArgs.add(pageSize);
    dataArgs.add(offset);

    String orderClause = buildOrderByClause(table, pageable, columnLookup);

    List<Map<String, Object>> rows = jdbc.queryForList(
        "select * from " + table + whereClause + orderClause + " limit ? offset ?", dataArgs.toArray());

    List<HybridViewDto> content = new ArrayList<>();
    for (Map<String, Object> row : rows) {
      UUID id = row.get("id") == null ? null : UUID.fromString(row.get("id").toString());
      Map<String, Object> attrs = new LinkedHashMap<>(row);
      attrs.remove("id");
      normalizeMediaColumns(attrs, columnLookup);
      content.add(new HybridViewDto(id, attrs));
    }
    return new PageImpl<>(content, pageable, total);
  }

  @Override
  @Transactional
  public HybridViewDto create(String entityType, HybridCreateDto dto) {
    String table = ensureConfigured(entityType);
    Map<String, Object> attrs = dto.attributes() == null ? Collections.emptyMap() : dto.attributes();
    Map<String, ColumnMeta> columnLookup = columnMetadata(table);
    List<String> cols = new ArrayList<>();
    List<Object> vals = new ArrayList<>();
    for (Map.Entry<String, Object> entry : attrs.entrySet()) {
      String col = Optional.ofNullable(entry.getKey()).orElse("");
      ColumnMeta meta = columnLookup.get(col.toLowerCase(Locale.ROOT));
      if (meta == null) continue;
      String actual = meta.name();
      if ("id".equalsIgnoreCase(actual)) continue;
      cols.add(actual);
      vals.add(convertValue(meta, entry.getValue()));
    }
    UUID id;
    if (cols.isEmpty()) {
      id = jdbc.queryForObject("insert into " + table + " default values returning id", UUID.class);
    } else {
      String placeholders = String.join(", ", Collections.nCopies(cols.size(), "?"));
      String columns = String.join(", ", cols);
      String sql = "insert into " + table + " (" + columns + ") values (" + placeholders + ") returning id";
      id = jdbc.queryForObject(sql, vals.toArray(), UUID.class);
    }
    return get(entityType, id);
  }

  @Override
  @Transactional
  public HybridViewDto update(String entityType, UUID id, HybridUpdateDto dto) {
    String table = ensureConfigured(entityType);
    Map<String, Object> attrs = dto.attributes() == null ? Collections.emptyMap() : dto.attributes();
    if (attrs.isEmpty()) {
      return get(entityType, id);
    }
    Map<String, ColumnMeta> columnLookup = columnMetadata(table);
    List<String> sets = new ArrayList<>();
    List<Object> vals = new ArrayList<>();
    for (Map.Entry<String, Object> entry : attrs.entrySet()) {
      String col = Optional.ofNullable(entry.getKey()).orElse("");
      ColumnMeta meta = columnLookup.get(col.toLowerCase(Locale.ROOT));
      if (meta == null) continue;
      String actual = meta.name();
      if ("id".equalsIgnoreCase(actual)) continue;
      sets.add(actual + " = ?");
      vals.add(convertValue(meta, entry.getValue()));
    }
    if (!sets.isEmpty()) {
      String sql = "update " + table + " set " + String.join(", ", sets) + " where id = ?";
      vals.add(id);
      jdbc.update(sql, vals.toArray());
    }
    return get(entityType, id);
  }

  @Override
  @Transactional
  public void delete(String entityType, UUID id) {
    String table = ensureConfigured(entityType);
    int updated = jdbc.update("delete from " + table + " where id = ?", id);
    if (updated == 0) {
      throw new NotFoundException("Entity not found");
    }
  }

  @Override
  public HybridViewDto get(String entityType, UUID id) {
    String table = ensureConfigured(entityType);
    try {
      Map<String, Object> row = jdbc.queryForMap("select * from " + table + " where id = ?", id);
      Map<String, Object> attrs = new LinkedHashMap<>(row);
      attrs.remove("id");
      normalizeMediaColumns(attrs, columnMetadata(table));
      return new HybridViewDto(id, attrs);
    } catch (EmptyResultDataAccessException ex) {
      throw new NotFoundException("Entity not found");
    }
  }

  @Override
  public List<HybridResponseDto.ColumnDto> listColumns(String entityType) {
    String table = ensureConfigured(entityType);
    boolean isOrdersDomain = "orders".equalsIgnoreCase(entityType) || "order".equalsIgnoreCase(entityType);
    List<Map<String, Object>> orderStatusOptions = isOrdersDomain ? loadOrderStatusOptions() : List.of();

    List<Map<String, Object>> rows = jdbc.queryForList("""
        select column_name, data_type, ordinal_position 
        from information_schema.columns
        where table_schema = current_schema() and table_name = ?
        order by ordinal_position
        """, table);

    Map<String, ColumnSemantics> semanticsByColumn = semanticsService.findByTable(table).stream()
        .collect(Collectors.toMap(
            s -> s.columnName().toLowerCase(Locale.ROOT),
            s -> s,
            (first, second) -> first));

    List<HybridResponseDto.ColumnDto> cols = new ArrayList<>();
    for (Map<String, Object> row : rows) {
      String name = String.valueOf(row.get("column_name"));
      if ("id".equalsIgnoreCase(name)) continue;

      String dataType = String.valueOf(row.get("data_type"));
      int order = Integer.parseInt(String.valueOf(row.get("ordinal_position"))) - 1;

      ColumnSemantics semantic = semanticsByColumn.get(name.toLowerCase(Locale.ROOT));
      HybridResponseDto.ColumnType type = mapSqlTypeToColumnType(name, dataType, semantic);
      String displayName = prettify(name);

      Map<String, Object> metadata = new HashMap<>();
      if (semantic != null && semantic.metadata() != null) {
        metadata.putAll(semantic.metadata());
      }
      metadata.putIfAbsent("maxImages", semantic != null
          ? semantic.maxImages(minioProperties.getDefaultMaxImages())
          : minioProperties.getDefaultMaxImages());
      metadata.put("maxFileSizeBytes", semantic != null
          ? semantic.maxFileSizeBytes(minioProperties.getMaxImageSizeBytes())
          : minioProperties.getMaxImageSizeBytes());
      metadata.put("allowedMimeTypes", semantic != null
          ? semantic.allowedMimeTypes(minioProperties.getAllowedImageMimeTypes())
          : minioProperties.getAllowedImageMimeTypes());
      if (isOrdersDomain && "status".equalsIgnoreCase(name) && !orderStatusOptions.isEmpty()) {
        metadata.put("options", orderStatusOptions);
        metadata.putIfAbsent("input", "select");
      }

      cols.add(new HybridResponseDto.ColumnDto(
          name,
          displayName,
          type,
          false,
          order,
          semantic != null ? semantic.semanticType() : null,
          metadata));
    }
    return cols;
  }

  private String ensureConfigured(String entityType) {
    String normalized = (entityType == null ? "" : entityType.trim().toLowerCase(Locale.ROOT));
    if (normalized.isEmpty()) {
      throw new NotFoundException("Unknown entity type");
    }
    String table;
    try {
      table = domainImportService.tableForDomain(normalized);
    } catch (IllegalArgumentException ex) {
      throw new NotFoundException("Unsupported entity type: " + normalized);
    }
    Boolean exists = jdbc.queryForObject(
        "select exists (select 1 from information_schema.tables where table_schema = current_schema() and table_name = ?)",
        Boolean.class, table);
    if (!Boolean.TRUE.equals(exists)) {
      throw new NotFoundException("Entity '" + normalized + "' is not configured");
    }
    return table;
  }

  private Map<String, ColumnMeta> columnMetadata(String table) {
    Map<String, ColumnSemantics> semantics = semanticsService.findByTable(table).stream()
        .collect(Collectors.toMap(
            s -> s.columnName().toLowerCase(Locale.ROOT),
            s -> s,
            (first, second) -> first));

    Map<String, ColumnMeta> map = new HashMap<>();
    jdbc.query(
        """
          select column_name, data_type
          from information_schema.columns
          where table_schema = current_schema()
            and table_name = ?
        """,
        rs -> {
          String name = rs.getString("column_name");
          String type = rs.getString("data_type");
          if (name != null) {
            ColumnSemantics semantic = semantics.get(name.toLowerCase(Locale.ROOT));
            map.put(name.toLowerCase(Locale.ROOT), new ColumnMeta(name, type, semantic));
          }
        },
        table);
    return map;
  }

  private Optional<String> buildColumnFilterClause(String table,
                                                   ColumnMeta meta,
                                                   FilterCriterion criterion,
                                                   List<Object> args) {
    if (!StringUtils.hasText(criterion.value())) {
      return Optional.empty();
    }
    String matchMode = (criterion.matchMode() == null ? "" : criterion.matchMode().trim().toLowerCase(Locale.ROOT));
    String column = meta.name();
    if (!StringUtils.hasText(column)) {
      return Optional.empty();
    }

    boolean isNumeric = isNumericColumn(meta, criterion);
    boolean isDate = isDateColumn(meta, criterion);

    if ("in".equals(matchMode)) {
      List<String> values = tryParseList(criterion.value());
      if (values != null && !values.isEmpty()) {
        String placeholders = values.stream().map(v -> "?").collect(Collectors.joining(","));
        args.addAll(values);
        return Optional.of(column + " in (" + placeholders + ")");
      }
      args.add(criterion.value());
      return Optional.of(column + " = ?");
    }

    if ("between".equals(matchMode)) {
      List<String> values = tryParseList(criterion.value());
      if (values == null || values.isEmpty()) {
        return Optional.empty();
      }
      if (isDate) {
        String startValue = values.get(0);
        String endValue = values.size() > 1 ? values.get(1) : values.get(0);
        Optional<Object> start = parseDateValue(startValue, false);
        Optional<Object> end = parseDateValue(endValue, true);
        if (start.isPresent() && end.isPresent()) {
          args.add(start.get());
          args.add(end.get());
          return Optional.of(column + " between ? and ?");
        }
        return Optional.empty();
      }
      if (isNumeric) {
        String startValue = values.get(0);
        String endValue = values.size() > 1 ? values.get(1) : startValue;
        args.add(startValue);
        args.add(endValue);
        return Optional.of(column + " between ? and ?");
      }
      return Optional.empty();
    }

    if (isDate && ("equals".equals(matchMode) || "on".equals(matchMode))) {
      Optional<Object> parsed = parseDateValue(criterion.value(), false);
      if (parsed.isPresent()) {
        args.add(parsed.get());
        return Optional.of(column + " = ?");
      }
      return Optional.empty();
    }

    if (matchMode.isEmpty() || "contains".equals(matchMode)) {
      args.add("%" + criterion.value().trim().toLowerCase(Locale.ROOT) + "%");
      return Optional.of("lower(" + column + "::text) like ?");
    }

    if ("equals".equals(matchMode) || "startswith".equals(matchMode) || "endswith".equals(matchMode)) {
      String value = criterion.value().trim();
      if (!StringUtils.hasText(value)) {
        return Optional.empty();
      }
      if ("startswith".equals(matchMode)) {
        args.add(value.toLowerCase(Locale.ROOT) + "%");
        return Optional.of("lower(" + column + "::text) like ?");
      }
      if ("endswith".equals(matchMode)) {
        args.add("%" + value.toLowerCase(Locale.ROOT));
        return Optional.of("lower(" + column + "::text) like ?");
      }
      args.add(value);
      return Optional.of(column + " = ?");
    }

    return Optional.empty();
  }

  private void applyOrderAgentRestriction(String entityType,
                                          Map<String, ColumnMeta> columnLookup,
                                          List<String> whereParts,
                                          List<Object> args) {
    if (!"orders".equalsIgnoreCase(entityType)) {
      return;
    }
    if (!currentUserService.hasRole("CONFIRMATION_AGENT")) {
      return;
    }
    if (currentUserService.hasAnyRole("ADMIN", "SUPERVISOR")) {
      return;
    }
    if (!columnLookup.containsKey("assigned_agent")) {
      return;
    }
    String username = currentUserService.getCurrentUser()
        .map(this::resolveAgentIdentifier)
        .orElse(null);
    if (!StringUtils.hasText(username)) {
      return;
    }
    whereParts.add("lower(assigned_agent) = ?");
    args.add(username.trim().toLowerCase(Locale.ROOT));
  }

  private String resolveAgentIdentifier(User user) {
    if (user == null) {
      return null;
    }
    String username = user.getUsername();
    if (StringUtils.hasText(username)) {
      return username.trim();
    }
    String email = user.getEmail();
    if (StringUtils.hasText(email)) {
      return email.trim();
    }
    return null;
  }

  private List<Map<String, Object>> loadOrderStatusOptions() {
    try {
      return jdbc.query(
          "select label_fr, label_en, name from order_statuses order by display_order asc, name asc",
          (rs, rowNum) -> {
            String label = firstNonBlank(rs.getString("label_fr"), rs.getString("label_en"), rs.getString("name"));
            if (!StringUtils.hasText(label)) {
              return null;
            }
            return Map.<String, Object>of(
                "label", label.trim(),
                "value", label.trim()
            );
          }
      ).stream().filter(Objects::nonNull).toList();
    } catch (Exception ex) {
      log.warn("Failed to load order status options: {}", ex.getMessage());
      return List.of();
    }
  }

  private String firstNonBlank(String... candidates) {
    if (candidates == null || candidates.length == 0) {
      return null;
    }
    for (String candidate : candidates) {
      if (StringUtils.hasText(candidate)) {
        return candidate.trim();
      }
    }
    return null;
  }

  private List<FilterCriterion> extractFilterCriteria(MultiValueMap<String, String> filters) {
    if (filters == null || filters.isEmpty()) {
      return List.of();
    }
    Map<String, List<String>> valuesByField = new LinkedHashMap<>();
    Map<String, List<String>> matchModesByField = new LinkedHashMap<>();
    Map<String, List<String>> typesByField = new LinkedHashMap<>();

    filters.forEach((key, values) -> {
      if (key == null || !key.startsWith("filter.")) {
        return;
      }
      String rawField = key.substring("filter.".length());
      if (!StringUtils.hasText(rawField)) {
        return;
      }
      String normalizedField = rawField.trim();
      String lowerField = normalizedField.toLowerCase(Locale.ROOT);
      boolean isMatchModeKey = lowerField.endsWith(".matchmode");
      boolean isTypeKey = lowerField.endsWith(".type");
      String fieldName = normalizedField;
      if (isMatchModeKey) {
        fieldName = normalizedField.substring(0, normalizedField.length() - ".matchMode".length());
      } else if (isTypeKey) {
        fieldName = normalizedField.substring(0, normalizedField.length() - ".type".length());
      }
      fieldName = fieldName.trim();
      if (!StringUtils.hasText(fieldName)) {
        return;
      }

      for (String value : values) {
        if (!StringUtils.hasText(value)) {
          continue;
        }
        if (isMatchModeKey) {
          matchModesByField.computeIfAbsent(fieldName, f -> new ArrayList<>()).add(value);
          continue;
        }
        if (isTypeKey) {
          typesByField.computeIfAbsent(fieldName, f -> new ArrayList<>()).add(value);
          continue;
        }
        try {
          Map<String, Object> parsed = OBJECT_MAPPER.readValue(value, MAP_STRING_OBJECT);
          Object filterValue = parsed.get("value");
          if (filterValue != null) {
            String serialized = filterValue instanceof Collection<?>
                ? OBJECT_MAPPER.writeValueAsString(filterValue)
                : Objects.toString(filterValue, null);
            if (StringUtils.hasText(serialized)) {
              valuesByField.computeIfAbsent(fieldName, f -> new ArrayList<>()).add(serialized);
            }
          }
          String parsedMatch = Objects.toString(parsed.get("matchMode"), null);
          if (StringUtils.hasText(parsedMatch)) {
            matchModesByField.computeIfAbsent(fieldName, f -> new ArrayList<>()).add(parsedMatch);
          }
          String parsedType = Objects.toString(parsed.get("type"), null);
          if (StringUtils.hasText(parsedType)) {
            typesByField.computeIfAbsent(fieldName, f -> new ArrayList<>()).add(parsedType);
          }
        } catch (Exception ex) {
          valuesByField.computeIfAbsent(fieldName, f -> new ArrayList<>()).add(value);
        }
      }
    });

    List<FilterCriterion> out = new ArrayList<>();
    Set<String> fields = new LinkedHashSet<>();
    fields.addAll(valuesByField.keySet());
    fields.addAll(matchModesByField.keySet());
    fields.addAll(typesByField.keySet());

    for (String field : fields) {
      List<String> vals = valuesByField.getOrDefault(field, List.of());
      List<String> modes = matchModesByField.getOrDefault(field, List.of());
      List<String> types = typesByField.getOrDefault(field, List.of());
      if (vals.isEmpty()) {
        continue;
      }
      for (int i = 0; i < vals.size(); i++) {
        String mode = i < modes.size() ? modes.get(i) : (modes.isEmpty() ? null : modes.get(modes.size() - 1));
        String type = i < types.size() ? types.get(i) : (types.isEmpty() ? null : types.get(types.size() - 1));
        out.add(new FilterCriterion(field, mode, vals.get(i), type));
      }
    }
    return out;
  }

  private boolean isNumericColumn(ColumnMeta meta, FilterCriterion criterion) {
    String dataType = meta.dataType() == null ? "" : meta.dataType().toLowerCase(Locale.ROOT);
    if (dataType.contains("int") || dataType.contains("numeric") || dataType.contains("decimal") || dataType.contains("double") || dataType.contains("real")) {
      return true;
    }
    String type = criterion.type() == null ? "" : criterion.type().toLowerCase(Locale.ROOT);
    return "numeric".equals(type) || "number".equals(type);
  }

  private boolean isDateColumn(ColumnMeta meta, FilterCriterion criterion) {
    String dataType = meta.dataType() == null ? "" : meta.dataType().toLowerCase(Locale.ROOT);
    if (dataType.contains("timestamp") || dataType.contains("date")) {
      return true;
    }
    String type = criterion.type() == null ? "" : criterion.type().toLowerCase(Locale.ROOT);
    return type.contains("date") || type.contains("time");
  }

  private List<String> tryParseList(String raw) {
    try {
      return OBJECT_MAPPER.readValue(raw, LIST_STRING);
    } catch (Exception ex) {
      return null;
    }
  }

  private Optional<Object> parseDateValue(String raw, boolean endOfDay) {
    if (!StringUtils.hasText(raw)) {
      return Optional.empty();
    }
    String trimmed = raw.trim();
    try {
      LocalDateTime ldt = LocalDateTime.parse(trimmed, DateTimeFormatter.ISO_LOCAL_DATE_TIME);
      return Optional.of(Timestamp.valueOf(ldt));
    } catch (Exception ignored) {
    }
    try {
      Instant instant = Instant.parse(trimmed);
      return Optional.of(Timestamp.from(instant));
    } catch (Exception ignored) {
    }
    try {
      LocalDate date = LocalDate.parse(trimmed, DateTimeFormatter.ISO_LOCAL_DATE);
      LocalDateTime boundary = endOfDay ? date.atTime(LocalTime.MAX) : date.atStartOfDay();
      return Optional.of(Timestamp.valueOf(boundary));
    } catch (Exception ignored) {
    }
    return Optional.of(trimmed);
  }

  private void normalizeMediaColumns(Map<String, Object> attrs, Map<String, ColumnMeta> columnLookup) {
    if (attrs == null || attrs.isEmpty()) {
      return;
    }
    for (Map.Entry<String, Object> entry : attrs.entrySet()) {
      String column = entry.getKey();
      ColumnMeta meta = column == null ? null : columnLookup.get(column.toLowerCase(Locale.ROOT));
      if (!isMinioImageColumn(meta)) {
        continue;
      }
      MinioImagePayload payload = MinioImagePayload.fromRaw(entry.getValue(), meta.semantics(), minioProperties, OBJECT_MAPPER);
      MinioImagePayload constrained = payload.ensureConstraints();
      MinioImagePayload refreshed = maybeRefreshOnRead(constrained);
      entry.setValue(refreshed.toClientPayload());
    }
  }

  private MinioImagePayload maybeRefreshOnRead(MinioImagePayload payload) {
    if (minioStorage == null || payload == null || payload.isEmpty()) {
      return payload;
    }
    if (!payload.needsRefresh(minioProperties.getRefreshThreshold(), minioProperties.getRefreshClockSkew(), Instant.now())) {
      return payload;
    }
    List<MinioImagePayload.Item> refreshed = new ArrayList<>();
    for (MinioImagePayload.Item item : payload.items()) {
      if (item == null || !StringUtils.hasText(item.key())) {
        refreshed.add(item);
        continue;
      }
      try {
        MinioFileStorageService.UploadResponse response = minioStorage.refreshUrl(
            item.key(),
            minioProperties.getDefaultExpiry(),
            item.contentType(),
            item.sizeBytes());
        refreshed.add(new MinioImagePayload.Item(
            response.key(),
            response.url(),
            response.expiresAt(),
            response.contentType(),
            response.sizeBytes()
        ));
      } catch (Exception ex) {
        log.warn("Failed to refresh MinIO URL for object {}: {}", item.key(), ex.getMessage());
        refreshed.add(item);
      }
    }
    return payload.withItems(refreshed);
  }

  private boolean isMinioImageColumn(ColumnMeta meta) {
    if (meta == null) {
      return false;
    }
    if (isMinioSemantic(meta.semantics())) {
      return true;
    }
    String name = meta.name() == null ? "" : meta.name().toLowerCase(Locale.ROOT);
    return name.contains("image") || name.endsWith("_url");
  }

  private boolean isMinioSemantic(ColumnSemantics semantics) {
    if (semantics == null) {
      return false;
    }
    String type = semantics.semanticType();
    if (!StringUtils.hasText(type)) {
      return false;
    }
    String normalized = type.trim().toUpperCase(Locale.ROOT).replace(':', '_');
    return normalized.equals(MinioImagePayload.TYPE) || normalized.equals("MINIO_IMAGE");
  }

  private Object convertValue(ColumnMeta meta, Object value) {
    if (value == null) {
      return null;
    }
    if (value instanceof CharSequence cs && cs.toString().trim().isEmpty()) {
      return null;
    }

    if (isMinioImageColumn(meta)) {
      MinioImagePayload payload = MinioImagePayload.fromRaw(value, meta.semantics(), minioProperties, OBJECT_MAPPER);
      if (payload.exceedsMaxImages()) {
        throw new BadRequestException("Column '" + meta.name() + "' accepts at most " + payload.maxImages() + " image(s)");
      }
      MinioImagePayload constrained = payload.ensureConstraints();
      if (constrained.isEmpty()) {
        return null;
      }
      boolean invalidItem = constrained.items().stream().anyMatch(item -> item == null || !StringUtils.hasText(item.key()) || !StringUtils.hasText(item.url()));
      if (invalidItem) {
        throw new BadRequestException("Uploaded image payload is incomplete for column '" + meta.name() + "'");
      }
      return constrained.toJson(OBJECT_MAPPER);
    }

    String dataType = meta.dataType() == null ? "" : meta.dataType().toLowerCase(Locale.ROOT);

    try {
      if (dataType.contains("timestamp")) {
        if (value instanceof Timestamp ts) return ts;
        if (value instanceof Instant instant) return Timestamp.from(instant);
        if (value instanceof LocalDateTime ldt) return Timestamp.valueOf(ldt);
        if (value instanceof CharSequence cs) {
          String text = cs.toString().trim();
          if (text.isEmpty()) return null;
          try {
            return Timestamp.from(Instant.parse(text));
          } catch (Exception ignored) {}
          try {
            return Timestamp.valueOf(LocalDateTime.parse(text, DateTimeFormatter.ISO_LOCAL_DATE_TIME));
          } catch (Exception ignored) {}
          String normalized = text.replace('T', ' ').replace("Z", "");
          return Timestamp.valueOf(normalized);
        }
      }

      if (dataType.contains("numeric") || dataType.contains("decimal")) {
        if (value instanceof BigDecimal bd) return bd;
        if (value instanceof Number number) {
          return BigDecimal.valueOf(number.doubleValue());
        }
        if (value instanceof CharSequence cs) {
          String text = cs.toString().trim();
          if (text.isEmpty()) return null;
          return new BigDecimal(text);
        }
      }

      if (dataType.contains("bigint") || dataType.contains("int")) {
        if (value instanceof Number number) {
          return number.longValue();
        }
        if (value instanceof CharSequence cs) {
          String text = cs.toString().trim();
          if (text.isEmpty()) return null;
          return Long.parseLong(text);
        }
      }
    } catch (Exception ex) {
      if (log.isDebugEnabled()) {
        log.debug("Failed to coerce value '{}' for column '{}' ({}). Using raw value.", value, meta.name(), dataType, ex);
      }
    }

    return value;
  }

  private String buildOrderByClause(String table, Pageable pageable, Map<String, ColumnMeta> columnLookup) {
    if (pageable == null || pageable.getSort().isUnsorted()) {
      return " order by id";
    }
    for (org.springframework.data.domain.Sort.Order order : pageable.getSort()) {
      String property = order.getProperty();
      if (!StringUtils.hasText(property)) {
        continue;
      }
      ColumnMeta meta = columnLookup.get(property.toLowerCase(Locale.ROOT));
      if (meta == null) {
        continue;
      }
      return " order by " + meta.name() + " " + (order.getDirection().isAscending() ? "asc" : "desc");
    }
    return " order by id";
  }

  private HybridResponseDto.ColumnType mapSqlTypeToColumnType(String name, String dataType, ColumnSemantics semantics) {
    if (isMinioSemantic(semantics)) {
      return HybridResponseDto.ColumnType.MINIO_IMAGE;
    }
    String n = name.toLowerCase();
    if (n.contains("image") || n.endsWith("_url")) return HybridResponseDto.ColumnType.MINIO_IMAGE;

    String dt = dataType.toLowerCase();
    if (dt.contains("bool")) return HybridResponseDto.ColumnType.BOOLEAN;
    if (dt.contains("int")) return HybridResponseDto.ColumnType.INTEGER;
    if (dt.contains("numeric") || dt.contains("decimal") || dt.contains("double") || dt.contains("real")) return HybridResponseDto.ColumnType.DECIMAL;
    if (dt.contains("date") || dt.contains("timestamp")) return HybridResponseDto.ColumnType.DATE;

    return HybridResponseDto.ColumnType.TEXT;
  }

  private String prettify(String name) {
    return Arrays.stream(name.replace('_', ' ').split(" "))
        .filter(s -> !s.isBlank())
        .map(s -> Character.toUpperCase(s.charAt(0)) + s.substring(1))
        .collect(Collectors.joining(" "));
  }

  /**
   * Metadata holder describing the database column backing a dynamic attribute.
   */
  private record ColumnMeta(String name, String dataType, ColumnSemantics semantics) {}

  /**
   * Parsed representation of a client-provided filter parameter.
   */
  private record FilterCriterion(String field, String matchMode, String value, String type) {}

  private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
  private static final TypeReference<Map<String, Object>> MAP_STRING_OBJECT = new TypeReference<>() {};
  private static final TypeReference<List<String>> LIST_STRING = new TypeReference<>() {};
}
