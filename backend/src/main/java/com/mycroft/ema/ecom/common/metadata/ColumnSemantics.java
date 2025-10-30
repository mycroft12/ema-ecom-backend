package com.mycroft.ema.ecom.common.metadata;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;

public final class ColumnSemantics {
  private final String domain;
  private final String tableName;
  private final String columnName;
  private final String semanticType;
  private final Map<String, Object> metadata;
  private final Instant createdAt;
  private final Instant updatedAt;

  public ColumnSemantics(String domain,
                         String tableName,
                         String columnName,
                         String semanticType,
                         Map<String, Object> metadata,
                         Instant createdAt,
                         Instant updatedAt) {
    this.domain = domain;
    this.tableName = tableName;
    this.columnName = columnName;
    this.semanticType = semanticType;
    this.metadata = metadata == null ? Collections.emptyMap() : Collections.unmodifiableMap(metadata);
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  public String domain() {
    return domain;
  }

  public String tableName() {
    return tableName;
  }

  public String columnName() {
    return columnName;
  }

  public String semanticType() {
    return semanticType;
  }

  public Map<String, Object> metadata() {
    return metadata;
  }

  public Instant createdAt() {
    return createdAt;
  }

  public Instant updatedAt() {
    return updatedAt;
  }

  public String semanticTypeNormalized() {
    return semanticType == null ? null : semanticType.trim().toUpperCase();
  }

  public int maxImages(int fallback) {
    Object value = metadata.get("maxImages");
    if (value instanceof Number number) {
      return Math.max(1, number.intValue());
    }
    if (value instanceof String str) {
      try {
        return Math.max(1, Integer.parseInt(str.trim()));
      } catch (NumberFormatException ignored) {
      }
    }
    return Math.max(1, fallback);
  }

  public long maxFileSizeBytes(long fallback) {
    Object value = metadata.get("maxFileSizeBytes");
    if (value instanceof Number number) {
      return Math.max(0L, number.longValue());
    }
    if (value instanceof String str) {
      try {
        return Math.max(0L, Long.parseLong(str.trim()));
      } catch (NumberFormatException ignored) {
      }
    }
    return Math.max(0L, fallback);
  }

  @SuppressWarnings("unchecked")
  public List<String> allowedMimeTypes(List<String> fallback) {
    Object value = metadata.get("allowedMimeTypes");
    if (value instanceof List<?> list) {
      return list.stream().map(Objects::toString).toList();
    }
    if (value instanceof String str) {
      if (str.contains(",")) {
        return List.of(str.split("\\s*,\\s*"));
      }
      return List.of(str.trim());
    }
    return fallback == null ? List.of() : fallback;
  }
}
