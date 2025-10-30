package com.mycroft.ema.ecom.domains.products.dto;

import org.springframework.data.domain.Page;

import java.util.List;

public class ResponseDto {
    // ColumnType: reuse your existing enum if you already have one on backend.
// If not, define a simple one mirroring the frontend.
    public enum ColumnType { TEXT, INTEGER, DECIMAL, DATE, BOOLEAN, MINIO_IMAGE, MINIO_FILE }

    // Describes one dynamic column
    public record ColumnDto(
            String name,
            String displayName,
            ColumnType type,
            boolean hidden,
            int displayOrder,
            String semanticType,
            java.util.Map<String, Object> metadata
    ) {}

    // Wrap page + (optional) schema
    public record ProductSearchResponse(
            List<ProductViewDto> content,
            int page,
            int size,
            long totalElements,
            int totalPages,
            List<ColumnDto> columns // may be null when includeSchema=false
    ) {
        public static ProductSearchResponse of(Page<ProductViewDto> p, List<ColumnDto> columns) {
            return new ProductSearchResponse(
                    p.getContent(),
                    p.getNumber(),
                    p.getSize(),
                    p.getTotalElements(),
                    p.getTotalPages(),
                    columns
            );
        }
    }

}
