package com.mycroft.ema.ecom.domains.hybrid.dto;

import org.springframework.data.domain.Page;

import java.util.List;
import java.util.Map;

public class HybridResponseDto {

  public enum ColumnType { TEXT, INTEGER, DECIMAL, DATE, BOOLEAN, MINIO_IMAGE, MINIO_FILE }

  public record ColumnDto(
      String name,
      String displayName,
      ColumnType type,
      boolean hidden,
      int displayOrder,
      String semanticType,
      Map<String, Object> metadata
  ) {}

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
