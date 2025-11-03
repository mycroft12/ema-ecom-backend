package com.mycroft.ema.ecom.domains.notifications.dto;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mycroft.ema.ecom.domains.notifications.domain.NotificationLog;

import java.util.Collections;
import java.util.List;

/**
 * Mapper that converts {@link NotificationLog} entities into DTOs and handles JSON column parsing.
 */
public class NotificationLogMapper {

  private final ObjectMapper mapper;

  public NotificationLogMapper(ObjectMapper mapper) {
    this.mapper = mapper;
  }

  public NotificationLogDto toDto(NotificationLog entity) {
    return new NotificationLogDto(
        entity.getId(),
        entity.getDomain(),
        entity.getAction(),
        entity.getRowId(),
        entity.getRowNumber(),
        deserializeChangedColumns(entity.getChangedColumns()),
        entity.getCreatedAt(),
        entity.isReadFlag()
    );
  }

  private List<String> deserializeChangedColumns(String json) {
    if (json == null || json.isBlank()) {
      return Collections.emptyList();
    }
    try {
      return mapper.readValue(json, mapper.getTypeFactory().constructCollectionType(List.class, String.class));
    } catch (JsonProcessingException e) {
      return List.of(json);
    }
  }
}
