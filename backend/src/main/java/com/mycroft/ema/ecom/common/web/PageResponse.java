package com.mycroft.ema.ecom.common.web;

import org.springframework.data.domain.Page;
import java.util.List;

/**
 * Lightweight wrapper around Spring Data's {@link Page} to expose pagination metadata in REST responses.
 */
public record PageResponse<T>(List<T> content, int page, int size, long totalElements, int totalPages, boolean last) {
  public static <T> PageResponse<T> of(Page<T> page) {
    return new PageResponse<>(page.getContent(), page.getNumber(), page.getSize(),
        page.getTotalElements(), page.getTotalPages(), page.isLast());
  }
}
