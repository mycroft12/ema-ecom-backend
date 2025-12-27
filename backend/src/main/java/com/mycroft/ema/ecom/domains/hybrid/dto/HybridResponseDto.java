package com.mycroft.ema.ecom.domains.hybrid.dto;

import org.springframework.data.domain.Page;

import java.util.List;
import java.util.Map;

/**
 * Aggregates DTO types used when returning hybrid entity search results and schema metadata.
 */
public class HybridResponseDto {

  /**
   * Enumerates the simplified client-facing column types supported by hybrid entities.
   */
  public enum ColumnType { TEXT, INTEGER, DECIMAL, DATE, BOOLEAN, MINIO_IMAGE, MINIO_FILE }

  /**
   * Metadata describing a dynamic column so the UI can render fields consistently.
   */
  public record ColumnDto(
      String name,
      String displayName,
      ColumnType type,
      boolean required,
      boolean hidden,
      int displayOrder,
      String semanticType,
      Map<String, Object> metadata
  ) {}

  /**
   * Composite response bundling paginated hybrid entities with optional column descriptors.
   */
  public record SearchResponse(
      List<HybridViewDto> content,
      int page,
      int size,
      long totalElements,
      int totalPages,
      List<ColumnDto> columns
  ) {
    public static SearchResponse of(Page<HybridViewDto> page, List<ColumnDto> columns) {
      return new SearchResponse(
          page.getContent(),
          page.getNumber(),
          page.getSize(),
          page.getTotalElements(),
          page.getTotalPages(),
          columns
      );
    }
  }
}
