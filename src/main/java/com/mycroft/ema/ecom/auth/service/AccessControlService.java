package com.mycroft.ema.ecom.auth.service;

import com.mycroft.ema.ecom.auth.domain.Permission;
import com.mycroft.ema.ecom.auth.domain.User;
import org.springframework.stereotype.Service;
import java.util.Set; import java.util.stream.Collectors;

@Service
public class AccessControlService {
  public Set<String> permissions(User u) {
    return u.getRoles().stream().flatMap(
            r -> r.getPermissions().stream()).map(Permission::getName)
            .collect(Collectors.toUnmodifiableSet());
  }
}
