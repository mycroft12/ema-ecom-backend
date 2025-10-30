package com.mycroft.ema.ecom.common.metadata;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

@Service
public class ColumnSemanticsService {

  private static final TypeReference<Map<String, Object>> MAP_REF = new TypeReference<>() {};

  private final JdbcTemplate jdbcTemplate;
  private final ObjectMapper objectMapper;

  public ColumnSemanticsService(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
    this.jdbcTemplate = jdbcTemplate;
    this.objectMapper = objectMapper;
  }

  public List<ColumnSemantics> findByTable(String tableName) {
    if (!StringUtils.hasText(tableName)) {
      return List.of();
    }
    return jdbcTemplate.query("""
        select domain, table_name, column_name, semantic_type, metadata, created_at, updated_at
        from column_semantics
        where table_name = ?
        """, (rs, rowNum) -> mapRow(rs), normalize(tableName));
  }

  public List<ColumnSemantics> findAll() {
    return jdbcTemplate.query("""
        select domain, table_name, column_name, semantic_type, metadata, created_at, updated_at
        from column_semantics
        """, (rs, rowNum) -> mapRow(rs));
  }

  public List<ColumnSemantics> findByDomain(String domain) {
    if (!StringUtils.hasText(domain)) {
      return List.of();
    }
    return jdbcTemplate.query("""
        select domain, table_name, column_name, semantic_type, metadata, created_at, updated_at
        from column_semantics
        where domain = ?
        """, (rs, rowNum) -> mapRow(rs), normalize(domain));
  }

  public Optional<ColumnSemantics> findByTableAndColumn(String tableName, String columnName) {
    if (!StringUtils.hasText(tableName) || !StringUtils.hasText(columnName)) {
      return Optional.empty();
    }
    try {
      ColumnSemantics semantics = jdbcTemplate.queryForObject("""
          select domain, table_name, column_name, semantic_type, metadata, created_at, updated_at
          from column_semantics
          where table_name = ? and column_name = ?
          """, (rs, rowNum) -> mapRow(rs), normalize(tableName), normalize(columnName));
      return Optional.ofNullable(semantics);
    } catch (EmptyResultDataAccessException ignored) {
      return Optional.empty();
    }
  }

  public Optional<ColumnSemantics> findByDomainAndColumn(String domain, String columnName) {
    if (!StringUtils.hasText(domain) || !StringUtils.hasText(columnName)) {
      return Optional.empty();
    }
    try {
      ColumnSemantics semantics = jdbcTemplate.queryForObject("""
          select domain, table_name, column_name, semantic_type, metadata, created_at, updated_at
          from column_semantics
          where domain = ? and column_name = ?
          """, (rs, rowNum) -> mapRow(rs), normalize(domain), normalize(columnName));
      return Optional.ofNullable(semantics);
    } catch (EmptyResultDataAccessException ignored) {
      return Optional.empty();
    }
  }

  @Transactional
  public void upsert(String domain,
                     String tableName,
                     String columnName,
                     String semanticType,
                     Map<String, Object> metadata) {
    if (!StringUtils.hasText(domain) || !StringUtils.hasText(tableName) || !StringUtils.hasText(columnName) ||
        !StringUtils.hasText(semanticType)) {
      return;
    }
    jdbcTemplate.update("""
        insert into column_semantics(domain, table_name, column_name, semantic_type, metadata, created_at, updated_at)
        values (?,?,?,?,?, now(), now())
        on conflict (table_name, column_name)
        do update set semantic_type = excluded.semantic_type,
                      metadata = excluded.metadata,
                      updated_at = now(),
                      domain = excluded.domain
        """,
        normalize(domain),
        normalize(tableName),
        normalize(columnName),
        semanticType.trim().toUpperCase(Locale.ROOT),
        serialize(metadata));
  }

  private ColumnSemantics mapRow(ResultSet rs) throws SQLException {
    String domain = rs.getString("domain");
    String table = rs.getString("table_name");
    String column = rs.getString("column_name");
    String semanticType = rs.getString("semantic_type");
    String metadataJson = rs.getString("metadata");
    Instant createdAt = rs.getTimestamp("created_at").toInstant();
    Instant updatedAt = rs.getTimestamp("updated_at").toInstant();
    Map<String, Object> metadata = parse(metadataJson);
    return new ColumnSemantics(domain, table, column, semanticType, metadata, createdAt, updatedAt);
  }

  private Map<String, Object> parse(String json) {
    if (!StringUtils.hasText(json)) {
      return Collections.emptyMap();
    }
    try {
      return objectMapper.readValue(json, MAP_REF);
    } catch (Exception ex) {
      return Collections.emptyMap();
    }
  }

  private String serialize(Map<String, Object> metadata) {
    if (metadata == null || metadata.isEmpty()) {
      return "{}";
    }
    try {
      return objectMapper.writeValueAsString(metadata);
    } catch (Exception ex) {
      return "{}";
    }
  }

  private String normalize(String value) {
    if (!StringUtils.hasText(value)) {
      return value;
    }
    return value.trim().toLowerCase(Locale.ROOT);
  }
}
