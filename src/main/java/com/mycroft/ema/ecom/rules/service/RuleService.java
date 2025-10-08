package com.mycroft.ema.ecom.rules.service;

import com.mycroft.ema.ecom.rules.dto.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface RuleService {
  Page<RuleViewDto> search(String q, Boolean active, Pageable pageable);
  RuleViewDto create(RuleCreateDto dto);
  RuleViewDto update(UUID id, RuleUpdateDto dto);
  void delete(UUID id);
  RuleViewDto get(UUID id);
}
