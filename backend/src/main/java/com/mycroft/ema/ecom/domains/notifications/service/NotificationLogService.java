package com.mycroft.ema.ecom.domains.notifications.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mycroft.ema.ecom.domains.notifications.domain.NotificationLog;
import com.mycroft.ema.ecom.domains.notifications.repo.NotificationLogRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class NotificationLogService {

  private final NotificationLogRepository repository;
  private final ObjectMapper mapper;

  public NotificationLogService(NotificationLogRepository repository, ObjectMapper mapper) {
    this.repository = repository;
    this.mapper = mapper;
  }

  public NotificationLog record(String domain, String action, UUID rowId, Long rowNumber, List<String> changedColumns) {
    String json = serializeChangedColumns(changedColumns);
    NotificationLog log = new NotificationLog(null, domain, action, rowId, rowNumber, json);
    return repository.save(log);
  }

  public List<NotificationLog> latest(int page, int size) {
    int safePage = Math.max(page, 0);
    int safeSize = Math.max(1, Math.min(size, 100));
    PageRequest request = PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "createdAt"));
    return repository.findAll(request).getContent();
  }

  public void markAsRead(UUID id) {
    repository.findById(id).ifPresent(entry -> {
      entry.markRead();
      repository.save(entry);
    });
  }

  public void markAllAsRead() {
    repository.findAll().forEach(entry -> {
      if (!entry.isReadFlag()) {
        entry.markRead();
        repository.save(entry);
      }
    });
  }

  private String serializeChangedColumns(List<String> columns) {
    if (columns == null || columns.isEmpty()) {
      return null;
    }
    try {
      return mapper.writeValueAsString(columns);
    } catch (JsonProcessingException e) {
      return String.join(",", columns);
    }
  }
}
