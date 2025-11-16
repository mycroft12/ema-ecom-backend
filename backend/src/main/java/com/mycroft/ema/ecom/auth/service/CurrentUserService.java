package com.mycroft.ema.ecom.auth.service;

import com.mycroft.ema.ecom.auth.domain.Role;
import com.mycroft.ema.ecom.auth.domain.User;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.Locale;
import java.util.Optional;

@Component
public class CurrentUserService {

  public Optional<User> getCurrentUser() {
    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
    if (authentication == null) {
      return Optional.empty();
    }
    Object principal = authentication.getPrincipal();
    if (principal instanceof User user) {
      return Optional.of(user);
    }
    return Optional.empty();
  }

  public boolean hasRole(String roleName) {
    if (!StringUtils.hasText(roleName)) {
      return false;
    }
    String normalized = roleName.trim().toLowerCase(Locale.ROOT);
    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
    if (authentication == null) {
      return false;
    }
    boolean authorityMatch = authentication.getAuthorities().stream()
        .map(GrantedAuthority::getAuthority)
        .filter(StringUtils::hasText)
        .map(auth -> auth.trim().toLowerCase(Locale.ROOT))
        .anyMatch(auth -> auth.equals("role_" + normalized));
    if (authorityMatch) {
      return true;
    }
    return getCurrentUser()
        .map(User::getRoles)
        .stream()
        .flatMap(roles -> roles.stream().map(Role::getName))
        .anyMatch(name -> name != null && name.trim().toLowerCase(Locale.ROOT).equals(normalized));
  }

  public boolean hasAnyRole(String... roleNames) {
    if (roleNames == null || roleNames.length == 0) {
      return false;
    }
    for (String role : roleNames) {
      if (hasRole(role)) {
        return true;
      }
    }
    return false;
  }
}
