package com.mycroft.ema.ecom.domains.notifications.web;

import com.mycroft.ema.ecom.domains.notifications.dto.NotificationLogDto;
import com.mycroft.ema.ecom.domains.notifications.dto.NotificationLogMapper;
import com.mycroft.ema.ecom.domains.notifications.service.NotificationLogService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

  private final NotificationLogService logService;
  private final NotificationLogMapper mapper;

  public NotificationController(NotificationLogService logService, NotificationLogMapper mapper) {
    this.logService = logService;
    this.mapper = mapper;
  }

  @GetMapping
  public List<NotificationLogDto> latest(@RequestParam(defaultValue = "0") int page,
                                         @RequestParam(value = "size", defaultValue = "20") int size,
                                         @RequestParam(value = "limit", required = false) Integer legacyLimit) {
    int resolvedSize = legacyLimit != null ? legacyLimit : size;
    return logService.latest(page, resolvedSize).stream().map(mapper::toDto).toList();
  }

  @PostMapping("/{id}/read")
  public ResponseEntity<Void> markRead(@PathVariable UUID id) {
    logService.markAsRead(id);
    return ResponseEntity.noContent().build();
  }

  @PostMapping("/read-all")
  public ResponseEntity<Void> markAllRead() {
    logService.markAllAsRead();
    return ResponseEntity.noContent().build();
  }
}
