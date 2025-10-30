package com.mycroft.ema.ecom.common.files;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mycroft.ema.ecom.common.metadata.ColumnSemantics;
import com.mycroft.ema.ecom.common.metadata.ColumnSemanticsService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.sql.ResultSet;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Component
@ConditionalOnBean(MinioFileStorageService.class)
public class MinioImageRefreshScheduler {

  private static final Logger log = LoggerFactory.getLogger(MinioImageRefreshScheduler.class);

  private final JdbcTemplate jdbcTemplate;
  private final MinioFileStorageService storageService;
  private final ColumnSemanticsService semanticsService;
  private final MinioProperties properties;
  private final ObjectMapper objectMapper;

  public MinioImageRefreshScheduler(JdbcTemplate jdbcTemplate,
                                    MinioFileStorageService storageService,
                                    ColumnSemanticsService semanticsService,
                                    MinioProperties properties,
                                    ObjectMapper objectMapper) {
    this.jdbcTemplate = jdbcTemplate;
    this.storageService = storageService;
    this.semanticsService = semanticsService;
    this.properties = properties;
    this.objectMapper = objectMapper;
  }

  @Scheduled(fixedDelayString = "${app.minio.refresh-interval:PT12H}")
  @Transactional
  public void refreshExpiringImages() {
    List<ColumnSemantics> semantics = semanticsService.findAll().stream()
        .filter(this::isMinioImage)
        .toList();
    if (semantics.isEmpty()) {
      return;
    }
    for (ColumnSemantics column : semantics) {
      try {
        refreshColumn(column);
      } catch (Exception ex) {
        log.warn("Failed to refresh MINIO images for {}.{}: {}", column.tableName(), column.columnName(), ex.getMessage());
      }
    }
  }

  private void refreshColumn(ColumnSemantics semantics) {
    String table = quoteIdentifier(semantics.tableName());
    String column = quoteIdentifier(semantics.columnName());
    String sql = "select id, " + column + " as payload from " + table + " where " + column + " is not null";

    jdbcTemplate.query(sql, (ResultSet rs) -> {
      while (rs.next()) {
        UUID id = getUuid(rs, "id");
        if (id == null) {
          continue;
        }
        String raw = rs.getString("payload");
      MinioImagePayload payload = MinioImagePayload.fromRaw(raw, semantics, properties, objectMapper);
      if (payload.isEmpty()) {
          continue;
      }
      if (!payload.needsRefresh(properties.getRefreshThreshold(), properties.getRefreshClockSkew(), Instant.now())) {
          continue;
      }
      List<MinioImagePayload.Item> refreshed = new ArrayList<>();
      for (MinioImagePayload.Item item : payload.items()) {
        if (item == null || !StringUtils.hasText(item.key())) {
          refreshed.add(item);
          continue;
        }
        try {
          MinioFileStorageService.UploadResponse response = storageService.refreshUrl(
              item.key(),
              properties.getDefaultExpiry(),
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
          log.warn("Failed to refresh MinIO object {}: {}", item.key(), ex.getMessage());
          refreshed.add(item);
        }
      }
      MinioImagePayload updated = payload.withItems(refreshed);
      String serialized = updated.toJson(objectMapper);
      jdbcTemplate.update("update " + table + " set " + column + " = ? where id = ?", serialized, id);
      }
      return null;
    });
  }

  private boolean isMinioImage(ColumnSemantics semantics) {
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

  private UUID getUuid(ResultSet rs, String column) {
    try {
      Object value = rs.getObject(column);
      if (value instanceof UUID uuid) {
        return uuid;
      }
      if (value != null) {
        return UUID.fromString(value.toString());
      }
      return null;
    } catch (Exception ex) {
      return null;
    }
  }

  private String quoteIdentifier(String identifier) {
    if (!StringUtils.hasText(identifier)) {
      throw new IllegalArgumentException("Identifier cannot be blank");
    }
    String sanitized = identifier.replace("\"", "\"\"");
    return "\"" + sanitized + "\"";
  }
}
