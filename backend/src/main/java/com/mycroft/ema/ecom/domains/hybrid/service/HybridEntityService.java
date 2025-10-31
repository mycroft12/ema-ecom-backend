package com.mycroft.ema.ecom.domains.hybrid.service;

import com.mycroft.ema.ecom.domains.hybrid.dto.HybridCreateDto;
import com.mycroft.ema.ecom.domains.hybrid.dto.HybridResponseDto;
import com.mycroft.ema.ecom.domains.hybrid.dto.HybridUpdateDto;
import com.mycroft.ema.ecom.domains.hybrid.dto.HybridViewDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.util.MultiValueMap;

import java.util.List;
import java.util.UUID;

public interface HybridEntityService {
  Page<HybridViewDto> search(String entityType, String q, MultiValueMap<String, String> filters, Pageable pageable);
  List<HybridResponseDto.ColumnDto> listColumns(String entityType);
  HybridViewDto create(String entityType, HybridCreateDto dto);
  HybridViewDto update(String entityType, UUID id, HybridUpdateDto dto);
  void delete(String entityType, UUID id);
  HybridViewDto get(String entityType, UUID id);
}
