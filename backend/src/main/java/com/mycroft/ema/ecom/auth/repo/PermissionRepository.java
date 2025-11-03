package com.mycroft.ema.ecom.auth.repo;

import com.mycroft.ema.ecom.auth.domain.Permission;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

/**
 * Spring Data repository for querying and persisting {@link Permission} entities.
 */
public interface PermissionRepository extends JpaRepository<Permission, UUID> {
    Optional<Permission> findByName(String name);
}
