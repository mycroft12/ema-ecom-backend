package com.mycroft.ema.ecom.domains.notifications.repo;

import com.mycroft.ema.ecom.domains.notifications.domain.NotificationLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface NotificationLogRepository extends JpaRepository<NotificationLog, UUID> {
}
