# Ema E‑commerce — Spring Modulith Scaffold (Java 21)

> Drop these files into your repo under `src/main/java` and `src/main/resources` as shown. Each section is `**path**` followed by the file contents.

---

## 0) POM additions

**pom.xml** (additions — merge with your existing)
```xml
<!-- Add inside <dependencies> -->
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-data-jpa</artifactId>
</dependency>
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-validation</artifactId>
</dependency>
<dependency>
  <groupId>org.springdoc</groupId>
  <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
  <version>2.6.0</version>
</dependency>
<dependency>
  <groupId>com.auth0</groupId>
  <artifactId>java-jwt</artifactId>
  <version>4.4.0</version>
</dependency>
<dependency>
  <groupId>org.mapstruct</groupId>
  <artifactId>mapstruct</artifactId>
  <version>1.6.3</version>
</dependency>
<dependency>
  <groupId>org.mapstruct</groupId>
  <artifactId>mapstruct-processor</artifactId>
  <version>1.6.3</version>
  <scope>provided</scope>
</dependency>
<dependency>
  <groupId>org.zalando</groupId>
  <artifactId>problem-spring-web</artifactId>
  <version>0.29.1</version>
</dependency>
```

```xml
<!-- Add/merge inside <build><plugins> -->
<plugin>
  <groupId>org.apache.maven.plugins</groupId>
  <artifactId>maven-compiler-plugin</artifactId>
  <configuration>
    <source>21</source><target>21</target>
    <annotationProcessorPaths>
      <path>
        <groupId>org.projectlombok</groupId>
        <artifactId>lombok</artifactId>
      </path>
      <path>
        <groupId>org.mapstruct</groupId>
        <artifactId>mapstruct-processor</artifactId>
        <version>1.6.3</version>
      </path>
    </annotationProcessorPaths>
    <parameters>true</parameters>
    <compilerArgs>
      <arg>-Amapstruct.defaultComponentModel=spring</arg>
    </compilerArgs>
  </configuration>
</plugin>
```

---

## 1) Package layout (create folders)

```
src/main/java/com/mycroft/ema/ecom/
  Application.java
  common/
    config/OpenApiConfig.java
    config/JacksonConfig.java (optional)
    config/i18n/MessageSourceConfig.java
    error/GlobalExceptionHandler.java
    error/NotFoundException.java
    web/PageResponse.java
    persistence/BaseEntity.java
  auth/
    Permission.java Role.java User.java RefreshToken.java
    repo/PermissionRepository.java RoleRepository.java UserRepository.java RefreshTokenRepository.java
    service/JwtService.java AuthService.java AccessControlService.java
    security/SecurityConfig.java MethodSecurityConfig.java
    web/AuthController.java RoleController.java PermissionController.java
  employees/
    package-info.java
    domain/Employee.java EmployeeType.java
    repo/EmployeeRepository.java
    dto/EmployeeDtos.java EmployeeMapper.java
    service/EmployeeService.java
    web/EmployeeController.java
  products/
    package-info.java
    domain/Product.java
    repo/ProductRepository.java
    dto/ProductDtos.java ProductMapper.java
    service/ProductService.java
    web/ProductController.java
  rules/
    package-info.java
    domain/Rule.java RuleType.java
    repo/RuleRepository.java
    dto/RuleDtos.java RuleMapper.java
    service/RuleEngine.java RuleService.java
    web/RuleController.java
```

Add package descriptors for Modulith (repeat for each top module):

**src/main/java/com/mycroft/ema/ecom/employees/package-info.java**
```java
@org.springframework.modulith.ApplicationModule(displayName = "Employees")
package com.mycroft.ema.ecom.employees;
```

**src/main/java/com/mycroft/ema/ecom/products/package-info.java**
```java
@org.springframework.modulith.ApplicationModule(displayName = "Products")
package com.mycroft.ema.ecom.products;
```

**src/main/java/com/mycroft/ema/ecom/rules/package-info.java**
```java
@org.springframework.modulith.ApplicationModule(displayName = "Rules")
package com.mycroft.ema.ecom.rules;
```

**src/main/java/com/mycroft/ema/ecom/auth/package-info.java**
```java
@org.springframework.modulith.ApplicationModule(displayName = "Auth")
package com.mycroft.ema.ecom.auth;
```

**src/main/java/com/mycroft/ema/ecom/common/package-info.java**
```java
@org.springframework.modulith.ApplicationModule(displayName = "Common")
package com.mycroft.ema.ecom.common;
```

---

## 2) Application entry

**src/main/java/com/mycroft/ema/ecom/Application.java**
```java
package com.mycroft.ema.ecom;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.modulith.Modulithic;

@SpringBootApplication
@Modulithic(sharedModules = "common")
public class Application {
  public static void main(String[] args) { SpringApplication.run(Application.class, args); }
}
```

---

## 3) Common module

**src/main/java/com/mycroft/ema/ecom/common/persistence/BaseEntity.java**
```java
package com.mycroft.ema.ecom.common.persistence;

import jakarta.persistence.*;
import lombok.Getter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.Instant;
import java.util.UUID;

@MappedSuperclass
@Getter
public abstract class BaseEntity {
  @Id @GeneratedValue
  private UUID id;

  @CreationTimestamp @Column(nullable=false, updatable=false)
  private Instant createdAt;

  @UpdateTimestamp @Column(nullable=false)
  private Instant updatedAt;
}
```

**src/main/java/com/mycroft/ema/ecom/common/web/PageResponse.java**
```java
package com.mycroft.ema.ecom.common.web;

import org.springframework.data.domain.Page;
import java.util.List;

public record PageResponse<T>(List<T> content, int page, int size, long totalElements, int totalPages, boolean last) {
  public static <T> PageResponse<T> of(Page<T> page) {
    return new PageResponse<>(page.getContent(), page.getNumber(), page.getSize(),
        page.getTotalElements(), page.getTotalPages(), page.isLast());
  }
}
```

**src/main/java/com/mycroft/ema/ecom/common/error/NotFoundException.java**
```java
package com.mycroft.ema.ecom.common.error;
public class NotFoundException extends RuntimeException {
  public NotFoundException(String message){ super(message); }
}
```

**src/main/java/com/mycroft/ema/ecom/common/error/GlobalExceptionHandler.java**
```java
package com.mycroft.ema.ecom.common.error;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.net.URI;

@RestControllerAdvice
public class GlobalExceptionHandler {
  @ExceptionHandler(NotFoundException.class)
  ProblemDetail handleNotFound(NotFoundException ex) {
    var pd = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
    pd.setTitle("Resource not found");
    pd.setType(URI.create("https://errors.ema.com/not-found"));
    return pd;
  }
  @ExceptionHandler(MethodArgumentNotValidException.class)
  ProblemDetail handleValidation(MethodArgumentNotValidException ex) {
    var pd = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Validation failed");
    pd.setProperty("errors", ex.getBindingResult().getFieldErrors().stream()
        .map(fe -> fe.getField() + ": " + fe.getDefaultMessage()).toList());
    pd.setType(URI.create("https://errors.ema.com/validation"));
    return pd;
  }
  @ExceptionHandler(Exception.class)
  ProblemDetail handleGeneric(Exception ex) {
    var pd = ProblemDetail.forStatusAndDetail(HttpStatus.INTERNAL_SERVER_ERROR, "Unexpected error");
    pd.setType(URI.create("https://errors.ema.com/internal"));
    return pd;
  }
}
```

**src/main/java/com/mycroft/ema/ecom/common/config/MessageSourceConfig.java**
```java
package com.mycroft.ema.ecom.common.config;

import org.springframework.context.MessageSource;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.support.ReloadableResourceBundleMessageSource;

@Configuration
public class MessageSourceConfig {
  @Bean
  MessageSource messageSource(){
    var ms = new ReloadableResourceBundleMessageSource();
    ms.setBasenames("classpath:i18n/messages");
    ms.setDefaultEncoding("UTF-8");
    ms.setFallbackToSystemLocale(false);
    return ms;
  }
}
```

**src/main/java/com/mycroft/ema/ecom/common/config/OpenApiConfig.java**
```java
package com.mycroft.ema.ecom.common.config;

import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import io.swagger.v3.oas.models.OpenAPI;

@Configuration
public class OpenApiConfig {
  @Bean
  OpenAPI api() {
    return new OpenAPI().info(new Info()
        .title("EMA E-commerce API")
        .description("Spring Modulith • JWT • Employees • Products • Rules")
        .version("v1"));
  }
}
```

---

## 4) Auth module (JWT + RBAC + permissions)

**src/main/java/com/mycroft/ema/ecom/auth/Permission.java**
```java
package com.mycroft.ema.ecom.auth;

import com.mycroft.ema.ecom.common.persistence.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter; import lombok.Setter;

@Entity @Table(name="permissions")
@Getter @Setter
public class Permission extends BaseEntity {
  @Column(unique = true, nullable = false)
  private String name; // e.g. employee:create
  private String description;
}
```

**src/main/java/com/mycroft/ema/ecom/auth/Role.java**

```java
package com.mycroft.ema.ecom.auth;

import com.mycroft.ema.ecom.auth.domain.Permission;
import com.mycroft.ema.ecom.common.persistence.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.Set;

@Entity
@Table(name = "roles")
@Getter
@Setter
public class Role extends BaseEntity {
    @Column(unique = true, nullable = false)
    private String name; // ADMIN, MANAGER
    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(name = "roles_permissions",
            joinColumns = @JoinColumn(name = "role_id"),
            inverseJoinColumns = @JoinColumn(name = "permission_id"))
    private Set<Permission> permissions = Set.of();
}
```

**src/main/java/com/mycroft/ema/ecom/auth/User.java**

```java
package com.mycroft.ema.ecom.auth;

import com.mycroft.ema.ecom.auth.domain.Role;
import com.mycroft.ema.ecom.common.persistence.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.Set;

@Entity
@Table(name = "users")
@Getter
@Setter
public class User extends BaseEntity {
    @Column(unique = true, nullable = false)
    private String username;
    @Column(nullable = false)
    private String password; // bcrypt
    @Column(nullable = false)
    private boolean enabled = true;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(name = "users_roles",
            joinColumns = @JoinColumn(name = "user_id"),
            inverseJoinColumns = @JoinColumn(name = "role_id"))
    private Set<Role> roles = Set.of();
}
```

**src/main/java/com/mycroft/ema/ecom/auth/RefreshToken.java**

```java
package com.mycroft.ema.ecom.auth;

import com.mycroft.ema.ecom.auth.domain.User;
import com.mycroft.ema.ecom.common.persistence.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "refresh_tokens")
@Getter
@Setter
public class RefreshToken extends BaseEntity {
    @Column(nullable = false, unique = true)
    private String token;
    @ManyToOne(optional = false)
    private User user;
    @Column(nullable = false)
    private Instant expiresAt;
    @Column(nullable = false)
    private boolean revoked = false;

    public boolean isActive() {
        return !revoked && Instant.now().isBefore(expiresAt);
    }
}
```

**src/main/java/com/mycroft/ema/ecom/auth/repo/Repositories.java**

```java
package com.mycroft.ema.ecom.auth.repo;

import com.mycroft.ema.ecom.auth.*;
import com.mycroft.ema.ecom.auth.domain.Permission;
import com.mycroft.ema.ecom.auth.domain.RefreshToken;
import com.mycroft.ema.ecom.auth.domain.Role;
import com.mycroft.ema.ecom.auth.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.*;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByUsername(String username);
}

public interface RoleRepository extends JpaRepository<Role, UUID> {
    Optional<Role> findByName(String name);
}

public interface PermissionRepository extends JpaRepository<Permission, UUID> {
    Optional<Permission> findByName(String name);
}

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {
    Optional<RefreshToken> findByToken(String token);

    long deleteByUser(User user);
}
```

**src/main/java/com/mycroft/ema/ecom/auth/service/JwtService.java**

```java
package com.mycroft.ema.ecom.auth.service;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Date;

@Service
public class JwtService {
    private final Algorithm algorithm;
    private final String issuer;
    private final long accessTtlSeconds;

    public JwtService(@Value("${app.jwt.secret}") String secret,
                      @Value("${app.jwt.issuer:ema-ecom}") String issuer,
                      @Value("${app.jwt.access-ttl-seconds:900}") long accessTtlSeconds) {
        this.algorithm = Algorithm.HMAC256(secret);
        this.issuer = issuer;
        this.accessTtlSeconds = accessTtlSeconds;
    }

    public String generateAccessToken(com.mycroft.ema.ecom.auth.domain.User user) {
        var now = Instant.now();
        return JWT.create()
                .withIssuer(issuer)
                .withSubject(user.getId().toString())
                .withClaim("username", user.getUsername())
                .withClaim("roles", user.getRoles().stream().map(r -> r.getName()).toList())
                .withIssuedAt(Date.from(now))
                .withExpiresAt(Date.from(now.plusSeconds(accessTtlSeconds)))
                .sign(algorithm);
    }

    public com.auth0.jwt.interfaces.DecodedJWT verify(String token) {
        return JWT.require(algorithm).withIssuer(issuer).build().verify(token);
    }
}
```

**src/main/java/com/mycroft/ema/ecom/auth/service/AccessControlService.java**

```java
package com.mycroft.ema.ecom.auth.service;

import org.springframework.stereotype.Service;

import java.util.Set;
import java.util.stream.Collectors;

@Service
public class AccessControlService {
    public Set<String> permissions(com.mycroft.ema.ecom.auth.domain.User u) {
        return u.getRoles().stream().flatMap(r -> r.getPermissions().stream()).map(p -> p.getName()).collect(Collectors.toUnmodifiableSet());
    }
}
```

**src/main/java/com/mycroft/ema/ecom/auth/service/AuthService.java**

```java
package com.mycroft.ema.ecom.auth.service;

import com.mycroft.ema.ecom.auth.domain.RefreshToken;
import com.mycroft.ema.ecom.auth.repo.RefreshTokenRepository;
import com.mycroft.ema.ecom.auth.repo.UserRepository;
import com.mycroft.ema.ecom.common.error.NotFoundException;
import jakarta.transaction.Transactional;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.UUID;

@Service
public class AuthService {
    private final UserRepository users;
    private final RefreshTokenRepository refreshTokens;
    private final JwtService jwt;
    private final PasswordEncoder encoder;

    public AuthService(UserRepository users, RefreshTokenRepository refreshTokens, JwtService jwt, PasswordEncoder encoder) {
        this.users = users;
        this.refreshTokens = refreshTokens;
        this.jwt = jwt;
        this.encoder = encoder;
    }

    public record LoginRequest(String username, String password) {
    }

    public record TokenPair(String accessToken, String refreshToken) {
    }

    @Transactional
    public TokenPair login(LoginRequest req) {
        var user = users.findByUsername(req.username()).orElseThrow(() -> new NotFoundException("User not found"));
        if (!user.isEnabled() || !encoder.matches(req.password(), user.getPassword()))
            throw new IllegalArgumentException("Bad credentials");
        var access = jwt.generateAccessToken(user);
        var refresh = new RefreshToken();
        refresh.setToken(UUID.randomUUID().toString());
        refresh.setUser(user);
        refresh.setExpiresAt(Instant.now().plusSeconds(60L * 60L * 24L * 7L));
        refreshTokens.save(refresh);
        return new TokenPair(access, refresh.getToken());
    }

    @Transactional
    public TokenPair refresh(String refreshToken) {
        var rt = refreshTokens.findByToken(refreshToken).orElseThrow(() -> new IllegalArgumentException("Invalid refresh token"));
        if (!rt.isActive()) throw new IllegalArgumentException("Refresh token expired/revoked");
        var user = rt.getUser();
        return new TokenPair(jwt.generateAccessToken(user), refreshToken);
    }

    @Transactional
    public void logout(String refreshToken) {
        refreshTokens.findByToken(refreshToken).ifPresent(rt -> {
            rt.setRevoked(true);
            refreshTokens.save(rt);
        });
    }
}
```

**src/main/java/com/mycroft/ema/ecom/auth/security/SecurityConfig.java**

```java
package com.mycroft.ema.ecom.auth.security;

import com.mycroft.ema.ecom.auth.repo.UserRepository;
import com.mycroft.ema.ecom.auth.service.AccessControlService;
import com.mycroft.ema.ecom.auth.service.JwtService;
import com.mycroft.ema.ecom.auth.domain.User;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collection;

@Configuration
public class SecurityConfig {
    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http, JwtAuthenticationFilter jwtFilter) throws Exception {
        http.csrf(csrf -> csrf.disable());
        http.sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS));
        http.authorizeHttpRequests(auth -> auth
                .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html", "/actuator/health").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/auth/login", "/api/auth/refresh").permitAll()
                .anyRequest().authenticated());
        http.addFilterBefore(jwtFilter, org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    JwtAuthenticationFilter jwtAuthenticationFilter(JwtService jwt, UserRepository users, AccessControlService ac) {
        return new JwtAuthenticationFilter(jwt, users, ac);
    }

    static class JwtAuthenticationToken extends AbstractAuthenticationToken {
        private final User principal;

        JwtAuthenticationToken(User user, Collection<SimpleGrantedAuthority> auth) {
            super(auth);
            this.principal = user;
            setAuthenticated(true);
        }

        @Override
        public Object getCredentials() {
            return "";
        }

        @Override
        public Object getPrincipal() {
            return principal;
        }
    }

    static class JwtAuthenticationFilter extends OncePerRequestFilter {
        private final JwtService jwt;
        private final UserRepository users;
        private final AccessControlService ac;

        JwtAuthenticationFilter(JwtService jwt, UserRepository users, AccessControlService ac) {
            this.jwt = jwt;
            this.users = users;
            this.ac = ac;
        }

        @Override
        protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain) throws ServletException, IOException {
            var header = req.getHeader("Authorization");
            if (header != null && header.startsWith("Bearer ")) {
                var token = header.substring(7);
                try {
                    var decoded = jwt.verify(token);
                    var userId = java.util.UUID.fromString(decoded.getSubject());
                    var user = users.findById(userId).orElse(null);
                    if (user != null && user.isEnabled()) {
                        var permissions = ac.permissions(user).stream().map(SimpleGrantedAuthority::new).toList();
                        var roles = user.getRoles().stream().map(r -> new SimpleGrantedAuthority("ROLE_" + r.getName())).toList();
                        var authorities = new java.util.ArrayList<>(permissions);
                        authorities.addAll(roles);
                        var auth = new JwtAuthenticationToken(user, authorities);
                        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(auth);
                    }
                } catch (Exception ignored) {
                }
            }
            chain.doFilter(req, res);
        }
    }
}
```

**src/main/java/com/mycroft/ema/ecom/auth/security/MethodSecurityConfig.java**
```java
package com.mycroft.ema.ecom.auth.security;

import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;

@Configuration
@EnableMethodSecurity
public class MethodSecurityConfig {}
```

**src/main/java/com/mycroft/ema/ecom/auth/web/AuthController.java**
```java
package com.mycroft.ema.ecom.auth.web;

import com.mycroft.ema.ecom.auth.service.AuthService;
import org.springframework.http.ResponseEntity; import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/auth")
public class AuthController {
  private final AuthService auth; public AuthController(AuthService auth){ this.auth = auth; }
  @PostMapping("/login") public ResponseEntity<AuthService.TokenPair> login(@RequestBody AuthService.LoginRequest req){ return ResponseEntity.ok(auth.login(req)); }
  public record RefreshRequest(String refreshToken){}
  @PostMapping("/refresh") public ResponseEntity<AuthService.TokenPair> refresh(@RequestBody RefreshRequest req){ return ResponseEntity.ok(auth.refresh(req.refreshToken())); }
  @PostMapping("/logout") public ResponseEntity<Void> logout(@RequestBody RefreshRequest req){ auth.logout(req.refreshToken()); return ResponseEntity.noContent().build(); }
}
```

**src/main/java/com/mycroft/ema/ecom/auth/web/RoleController.java**

```java
package com.mycroft.ema.ecom.auth.web;

import com.mycroft.ema.ecom.auth.domain.Role;
import com.mycroft.ema.ecom.auth.domain.Role;
import com.mycroft.ema.ecom.auth.repo.RoleRepository;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/roles")
public class RoleController {
    private final RoleRepository roles;

    public RoleController(RoleRepository roles) {
        this.roles = roles;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('role:read')")
    public List<Role> findAll() {
        return roles.findAll();
    }

    @PostMapping
    @PreAuthorize("hasAuthority('role:create')")
    public com.mycroft.ema.ecom.auth.domain.Role create(@RequestBody Role r) {
        return roles.save(r);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('role:update')")
    public com.mycroft.ema.ecom.auth.domain.Role update(@PathVariable UUID id, @RequestBody Role r) {
        r.setId(id);
        return roles.save(r);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('role:delete')")
    public void delete(@PathVariable UUID id) {
        roles.deleteById(id);
    }
}
```

**src/main/java/com/mycroft/ema/ecom/auth/web/PermissionController.java**

```java
package com.mycroft.ema.ecom.auth.web;

import com.mycroft.ema.ecom.auth.domain.Permission;
import com.mycroft.ema.ecom.auth.repo.PermissionRepository;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/permissions")
public class PermissionController {
    private final PermissionRepository perms;

    public PermissionController(PermissionRepository perms) {
        this.perms = perms;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('permission:read')")
    public List<Permission> findAll() {
        return perms.findAll();
    }

    @PostMapping
    @PreAuthorize("hasAuthority('permission:create')")
    public Permission create(@RequestBody Permission p) {
        return perms.save(p);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('permission:update')")
    public Permission update(@PathVariable UUID id, @RequestBody Permission p) {
        p.setId(id);
        return perms.save(p);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('permission:delete')")
    public void delete(@PathVariable UUID id) {
        perms.deleteById(id);
    }
}
```

---

## 5) Employees module

**src/main/java/com/mycroft/ema/ecom/employees/domain/EmployeeType.java**
```java
package com.mycroft.ema.ecom.employees.domain;
public enum EmployeeType { DELIVERY_COMPANY, INDIVIDUAL }
```

**src/main/java/com/mycroft/ema/ecom/employees/domain/Employee.java**
```java
package com.mycroft.ema.ecom.employees.domain;

import com.mycroft.ema.ecom.common.persistence.BaseEntity;
import jakarta.persistence.*; import lombok.Getter; import lombok.Setter;

@Entity @Table(name="employees")
@Getter @Setter
public class Employee extends BaseEntity {
  @Column(nullable=false) private String firstName;
  @Column(nullable=false) private String lastName;
  @Enumerated(EnumType.STRING) @Column(nullable=false) private EmployeeType type;
  private String companyName; private String phone; private String email;
}
```

**src/main/java/com/mycroft/ema/ecom/employees/dto/EmployeeDtos.java**
```java
package com.mycroft.ema.ecom.employees.dto;

import com.mycroft.ema.ecom.employees.domain.EmployeeType;
import jakarta.validation.constraints.*; import java.util.UUID;

public record EmployeeCreateDto(@NotBlank String firstName, @NotBlank String lastName, @NotNull EmployeeType type, String companyName, @Pattern(regexp="^\\+?[0-9 .-]{6,}$", message="invalid phone") String phone, @Email String email) {}
public record EmployeeUpdateDto(@NotBlank String firstName, @NotBlank String lastName, @NotNull EmployeeType type, String companyName, @Pattern(regexp="^\\+?[0-9 .-]{6,}$") String phone, @Email String email) {}
public record EmployeeViewDto(UUID id, String firstName, String lastName, EmployeeType type, String companyName, String phone, String email) {}
```

**src/main/java/com/mycroft/ema/ecom/employees/dto/EmployeeMapper.java**
```java
package com.mycroft.ema.ecom.employees.dto;

import com.mycroft.ema.ecom.employees.domain.Employee;
import org.mapstruct.*;

@Mapper
public interface EmployeeMapper {
  Employee toEntity(EmployeeCreateDto dto);
  @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
  void updateEntity(EmployeeUpdateDto dto, @MappingTarget Employee entity);
  EmployeeViewDto toView(Employee e);
}
```

**src/main/java/com/mycroft/ema/ecom/employees/repo/EmployeeRepository.java**
```java
package com.mycroft.ema.ecom.employees.repo;

import com.mycroft.ema.ecom.employees.domain.Employee;
import org.springframework.data.jpa.repository.*; import org.springframework.data.jpa.domain.Specification;
import java.util.UUID;

public interface EmployeeRepository extends JpaRepository<Employee, UUID>, JpaSpecificationExecutor<Employee> {
  static Specification<Employee> firstNameLike(String q){ return (root, cq, cb) -> q==null?null:cb.like(cb.lower(root.get("firstName")), "%"+q.toLowerCase()+"%"); }
  static Specification<Employee> lastNameLike(String q){ return (root, cq, cb) -> q==null?null:cb.like(cb.lower(root.get("lastName")), "%"+q.toLowerCase()+"%"); }
  static Specification<Employee> typeEq(com.mycroft.ema.ecom.employees.domain.EmployeeType type){ return (root, cq, cb) -> type==null?null:cb.equal(root.get("type"), type); }
}
```

**src/main/java/com/mycroft/ema/ecom/employees/service/EmployeeService.java**

```java
package com.mycroft.ema.ecom.employees.service;

import com.mycroft.ema.ecom.common.error.NotFoundException;
import com.mycroft.ema.ecom.employees.domain.Employee;
import com.mycroft.ema.ecom.employees.domain.EmployeeType;
import com.mycroft.ema.ecom.employees.repo.EmployeeRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class EmployeeService {
    private final EmployeeRepository repo;
    private final EmployeeMapper mapper;

    public EmployeeService(EmployeeRepository repo, EmployeeMapper mapper) {
        this.repo = repo;
        this.mapper = mapper;
    }

    public Page<EmployeeViewDto> search(String q, EmployeeType type, Pageable pageable) {
        Specification<Employee> spec = Specification.where(firstNameLike(q)).or(lastNameLike(q)).and(typeEq(type));
        return repo.findAll(spec, pageable).map(mapper::toView);
    }

    public EmployeeViewDto create(EmployeeCreateDto dto) {
        return mapper.toView(repo.save(mapper.toEntity(dto)));
    }

    public EmployeeViewDto update(UUID id, EmployeeUpdateDto dto) {
        var e = repo.findById(id).orElseThrow(() -> new NotFoundException("Employee not found"));
        mapper.updateEntity(dto, e);
        return mapper.toView(repo.save(e));
    }

    public void delete(UUID id) {
        repo.deleteById(id);
    }

    public EmployeeViewDto get(UUID id) {
        return repo.findById(id).map(mapper::toView).orElseThrow(() -> new NotFoundException("Employee not found"));
    }
}
```

**src/main/java/com/mycroft/ema/ecom/employees/web/EmployeeController.java**

```java
package com.mycroft.ema.ecom.employees.web;

import com.mycroft.ema.ecom.common.web.PageResponse;
import com.mycroft.ema.ecom.employees.domain.EmployeeType;
import com.mycroft.ema.ecom.employees.service.EmployeeService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/employees")
public class EmployeeController {
    private final EmployeeService service;

    public EmployeeController(EmployeeService service) {
        this.service = service;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('employee:read')")
    public PageResponse<EmployeeViewDto> search(@RequestParam(required = false) String q, @RequestParam(required = false) EmployeeType type, Pageable pageable) {
        return PageResponse.of(service.search(q, type, pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('employee:read')")
    public EmployeeViewDto get(@PathVariable UUID id) {
        return service.get(id);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('employee:create')")
    public EmployeeViewDto create(@Valid @RequestBody EmployeeCreateDto dto) {
        return service.create(dto);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('employee:update')")
    public EmployeeViewDto update(@PathVariable UUID id, @Valid @RequestBody EmployeeUpdateDto dto) {
        return service.update(id, dto);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('employee:delete')")
    public void delete(@PathVariable UUID id) {
        service.delete(id);
    }
}
```

---

## 6) Products module

**src/main/java/com/mycroft/ema/ecom/products/domain/Product.java**
```java
package com.mycroft.ema.ecom.products.domain;

import com.mycroft.ema.ecom.common.persistence.BaseEntity;
import jakarta.persistence.*; import lombok.Getter; import lombok.Setter;
import java.math.BigDecimal;

@Entity @Table(name="products")
@Getter @Setter
public class Product extends BaseEntity {
  @Column(nullable=false) private String name;
  private String description;
  @Column(nullable=false) private BigDecimal price;
  private String photoUrl; // single photo
  private boolean active = true;
}
```

**src/main/java/com/mycroft/ema/ecom/products/dto/ProductDtos.java**
```java
package com.mycroft.ema.ecom.products.dto;

import jakarta.validation.constraints.*; import java.math.BigDecimal; import java.util.UUID;

public record ProductCreateDto(@NotBlank String name, @DecimalMin(value="0.0", inclusive=false) BigDecimal price, String description, String photoUrl, Boolean active) {}
public record ProductUpdateDto(@NotBlank String name, @DecimalMin(value="0.0", inclusive=false) BigDecimal price, String description, String photoUrl, Boolean active) {}
public record ProductViewDto(UUID id, String name, String description, BigDecimal price, String photoUrl, boolean active) {}
```

**src/main/java/com/mycroft/ema/ecom/products/dto/ProductMapper.java**
```java
package com.mycroft.ema.ecom.products.dto;

import com.mycroft.ema.ecom.products.domain.Product;
import org.mapstruct.*;

@Mapper
public interface ProductMapper {
  Product toEntity(ProductCreateDto dto);
  @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
  void updateEntity(ProductUpdateDto dto, @MappingTarget Product entity);
  ProductViewDto toView(Product p);
}
```

**src/main/java/com/mycroft/ema/ecom/products/repo/ProductRepository.java**
```java
package com.mycroft.ema.ecom.products.repo;

import com.mycroft.ema.ecom.products.domain.Product; import org.springframework.data.jpa.repository.JpaRepository; import org.springframework.data.jpa.repository.JpaSpecificationExecutor; import java.util.UUID;

public interface ProductRepository extends JpaRepository<Product, UUID>, JpaSpecificationExecutor<Product> {}
```

**src/main/java/com/mycroft/ema/ecom/products/service/ProductService.java**

```java
package com.mycroft.ema.ecom.products.service;

import com.mycroft.ema.ecom.common.error.NotFoundException;
import com.mycroft.ema.ecom.products.domain.Product;
import com.mycroft.ema.ecom.products.repo.ProductRepository;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class ProductService {
    private final ProductRepository repo;
    private final ProductMapper mapper;

    public ProductService(ProductRepository repo, ProductMapper mapper) {
        this.repo = repo;
        this.mapper = mapper;
    }

    public Page<ProductViewDto> search(String q, Boolean active, Pageable pageable) {
        Specification<Product> spec = Specification.where((root, cq, cb) -> q == null ? null : cb.like(cb.lower(root.get("name")), "%" + q.toLowerCase() + "%"))
                .and((root, cq, cb) -> active == null ? null : cb.equal(root.get("active"), active));
        return repo.findAll(spec, pageable).map(mapper::toView);
    }

    public ProductViewDto create(ProductCreateDto dto) {
        return mapper.toView(repo.save(mapper.toEntity(dto)));
    }

    public ProductViewDto update(UUID id, ProductUpdateDto dto) {
        var p = repo.findById(id).orElseThrow(() -> new NotFoundException("Product not found"));
        mapper.updateEntity(dto, p);
        return mapper.toView(repo.save(p));
    }

    public void delete(UUID id) {
        repo.deleteById(id);
    }

    public ProductViewDto get(UUID id) {
        return repo.findById(id).map(mapper::toView).orElseThrow(() -> new NotFoundException("Product not found"));
    }
}
```

**src/main/java/com/mycroft/ema/ecom/products/web/ProductController.java**

```java
package com.mycroft.ema.ecom.products.web;

import com.mycroft.ema.ecom.common.web.PageResponse;
import com.mycroft.ema.ecom.products.service.ProductService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/products")
public class ProductController {
    private final ProductService service;

    public ProductController(ProductService service) {
        this.service = service;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('product:read')")
    public PageResponse<ProductViewDto> search(@RequestParam(required = false) String q, @RequestParam(required = false) Boolean active, Pageable pageable) {
        return PageResponse.of(service.search(q, active, pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('product:read')")
    public ProductViewDto get(@PathVariable UUID id) {
        return service.get(id);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('product:create')")
    public ProductViewDto create(@Valid @RequestBody ProductCreateDto dto) {
        return service.create(dto);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('product:update')")
    public ProductViewDto update(@PathVariable UUID id, @Valid @RequestBody ProductUpdateDto dto) {
        return service.update(id, dto);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('product:delete')")
    public void delete(@PathVariable UUID id) {
        service.delete(id);
    }
}
```

---

## 7) Rules module

**src/main/java/com/mycroft/ema/ecom/rules/domain/RuleType.java**
```java
package com.mycroft.ema.ecom.rules.domain;
public enum RuleType { REVENUE_FORMULA, DISCOUNT_FORMULA, CUSTOM_GROOVY }
```

**src/main/java/com/mycroft/ema/ecom/rules/domain/Rule.java**
```java
package com.mycroft.ema.ecom.rules.domain;

import com.mycroft.ema.ecom.common.persistence.BaseEntity;
import jakarta.persistence.*; import lombok.Getter; import lombok.Setter;

@Entity @Table(name="rules")
@Getter @Setter
public class Rule extends BaseEntity {
  @Column(nullable=false) private String name;
  @Enumerated(EnumType.STRING) @Column(nullable=false) private RuleType type;
  @Column(nullable=false, length=4000) private String expression;
  private boolean active = true;
}
```

**src/main/java/com/mycroft/ema/ecom/rules/dto/RuleDtos.java**
```java
package com.mycroft.ema.ecom.rules.dto;

import com.mycroft.ema.ecom.rules.domain.RuleType;
import jakarta.validation.constraints.*; import java.util.UUID;

public record RuleCreateDto(@NotBlank String name, @NotNull RuleType type, @NotBlank String expression, Boolean active) {}
public record RuleUpdateDto(@NotBlank String name, @NotNull RuleType type, @NotBlank String expression, Boolean active) {}
public record RuleViewDto(UUID id, String name, RuleType type, String expression, boolean active) {}
```

**src/main/java/com/mycroft/ema/ecom/rules/dto/RuleMapper.java**
```java
package com.mycroft.ema.ecom.rules.dto;

import com.mycroft.ema.ecom.rules.domain.Rule;
import org.mapstruct.*;

@Mapper
public interface RuleMapper {
  Rule toEntity(RuleCreateDto dto);
  @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
  void updateEntity(RuleUpdateDto dto, @MappingTarget Rule entity);
  RuleViewDto toView(Rule r);
}
```

**src/main/java/com/mycroft/ema/ecom/rules/repo/RuleRepository.java**
```java
package com.mycroft.ema.ecom.rules.repo;

import com.mycroft.ema.ecom.rules.domain.Rule; import org.springframework.data.jpa.repository.JpaRepository; import org.springframework.data.jpa.repository.JpaSpecificationExecutor; import java.util.UUID;

public interface RuleRepository extends JpaRepository<Rule, UUID>, JpaSpecificationExecutor<Rule> {}
```

**src/main/java/com/mycroft/ema/ecom/rules/service/RuleEngine.java**
```java
package com.mycroft.ema.ecom.rules.service;

import com.mycroft.ema.ecom.rules.domain.Rule; import org.springframework.stereotype.Component; import java.util.Map;

@Component
public class RuleEngine {
  public Map<String,Object> evaluate(Rule rule, Map<String,Object> facts){
    return Map.of("result","not-implemented");
  }
}
```

**src/main/java/com/mycroft/ema/ecom/rules/service/RuleService.java**
```java
package com.mycroft.ema.ecom.rules.service;

import com.mycroft.ema.ecom.common.error.NotFoundException; import com.mycroft.ema.ecom.rules.domain.Rule; import com.mycroft.ema.ecom.rules.dto.*; import com.mycroft.ema.ecom.rules.repo.RuleRepository;
import org.springframework.data.domain.*; import org.springframework.data.jpa.domain.Specification; import org.springframework.stereotype.Service; import java.util.UUID;

@Service
public class RuleService {
  private final RuleRepository repo; private final RuleMapper mapper; private final RuleEngine engine;
  public RuleService(RuleRepository repo, RuleMapper mapper, RuleEngine engine){ this.repo=repo; this.mapper=mapper; this.engine=engine; }
  public Page<RuleViewDto> search(String q, Boolean active, Pageable pageable){
    Specification<Rule> spec = Specification.where((root, cq, cb) -> q==null? null : cb.like(cb.lower(root.get("name")), "%"+q.toLowerCase()+"%"))
        .and((root, cq, cb) -> active==null?null:cb.equal(root.get("active"), active));
    return repo.findAll(spec, pageable).map(mapper::toView);
  }
  public RuleViewDto create(RuleCreateDto dto){ return mapper.toView(repo.save(mapper.toEntity(dto))); }
  public RuleViewDto update(UUID id, RuleUpdateDto dto){ var r = repo.findById(id).orElseThrow(()->new NotFoundException("Rule not found")); mapper.updateEntity(dto, r); return mapper.toView(repo.save(r)); }
  public void delete(UUID id){ repo.deleteById(id); }
  public RuleViewDto get(UUID id){ return repo.findById(id).map(mapper::toView).orElseThrow(()->new NotFoundException("Rule not found")); }
}
```

**src/main/java/com/mycroft/ema/ecom/rules/web/RuleController.java**
```java
package com.mycroft.ema.ecom.rules.web;

import com.mycroft.ema.ecom.common.web.PageResponse; import com.mycroft.ema.ecom.rules.dto.*; import com.mycroft.ema.ecom.rules.service.RuleService;
import jakarta.validation.Valid; import org.springframework.data.domain.Pageable; import org.springframework.security.access.prepost.PreAuthorize; import org.springframework.web.bind.annotation.*; import java.util.Map; import java.util.UUID;

@RestController @RequestMapping("/api/rules")
public class RuleController {
  private final RuleService service; public RuleController(RuleService service){ this.service=service; }
  @GetMapping @PreAuthorize("hasAuthority('rule:read')") public PageResponse<RuleViewDto> search(@RequestParam(required=false) String q, @RequestParam(required=false) Boolean active, Pageable pageable){ return PageResponse.of(service.search(q, active, pageable)); }
  @GetMapping("/{id}") @PreAuthorize("hasAuthority('rule:read')") public RuleViewDto get(@PathVariable UUID id){ return service.get(id); }
  @PostMapping @PreAuthorize("hasAuthority('rule:create')") public RuleViewDto create(@Valid @RequestBody RuleCreateDto dto){ return service.create(dto); }
  @PutMapping("/{id}") @PreAuthorize("hasAuthority('rule:update')") public RuleViewDto update(@PathVariable UUID id, @Valid @RequestBody RuleUpdateDto dto){ return service.update(id, dto); }
  @DeleteMapping("/{id}") @PreAuthorize("hasAuthority('rule:delete')") public void delete(@PathVariable UUID id){ service.delete(id); }
  @PostMapping("/{id}/evaluate") @PreAuthorize("hasAuthority('rule:evaluate')") public Map<String,Object> evaluate(@PathVariable UUID id, @RequestBody Map<String,Object> facts){ return Map.of("status","not-implemented"); }
}
```

---

## 8) Resources & config

**src/main/resources/application.properties**
```properties
spring.application.name=ema-ecom
spring.profiles.active=dev
spring.jpa.hibernate.ddl-auto=validate
spring.jpa.open-in-view=false
spring.jpa.properties.hibernate.format_sql=true
spring.flyway.enabled=true
springdoc.swagger-ui.enabled=true
app.jwt.issuer=ema-ecom
app.jwt.access-ttl-seconds=900
```

**src/main/resources/application-dev.properties**
```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/ema_ecom
spring.datasource.username=postgres
spring.datasource.password=postgres
app.jwt.secret=dev-change-me
```

**src/main/resources/application-prod.properties**
```properties
spring.datasource.url=${DB_URL}
spring.datasource.username=${DB_USER}
spring.datasource.password=${DB_PASS}
app.jwt.secret=${JWT_SECRET}
```

**src/main/resources/i18n/messages.properties**
```properties
employee.notfound=Employee not found
product.notfound=Product not found
rule.notfound=Rule not found
```

---

## 9) Flyway migration

**src/main/resources/db/migration/V1__init.sql**
```sql
create extension if not exists pgcrypto; -- for gen_random_uuid()

create table permissions (
  id uuid primary key,
  created_at timestamp not null,
  updated_at timestamp not null,
  name varchar(128) unique not null,
  description varchar(512)
);
create table roles (
  id uuid primary key,
  created_at timestamp not null,
  updated_at timestamp not null,
  name varchar(64) unique not null
);
create table roles_permissions (
  role_id uuid not null references roles(id) on delete cascade,
  permission_id uuid not null references permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);
create table users (
  id uuid primary key,
  created_at timestamp not null,
  updated_at timestamp not null,
  username varchar(128) unique not null,
  password varchar(255) not null,
  enabled boolean not null
);
create table users_roles (
  user_id uuid not null references users(id) on delete cascade,
  role_id uuid not null references roles(id) on delete cascade,
  primary key (user_id, role_id)
);
create table refresh_tokens (
  id uuid primary key,
  created_at timestamp not null,
  updated_at timestamp not null,
  token varchar(255) unique not null,
  user_id uuid not null references users(id) on delete cascade,
  expires_at timestamp not null,
  revoked boolean not null
);
create table employees (
  id uuid primary key,
  created_at timestamp not null,
  updated_at timestamp not null,
  first_name varchar(128) not null,
  last_name varchar(128) not null,
  type varchar(32) not null,
  company_name varchar(256),
  phone varchar(64),
  email varchar(256)
);
create table products (
  id uuid primary key,
  created_at timestamp not null,
  updated_at timestamp not null,
  name varchar(256) not null,
  description text,
  price numeric(18,2) not null,
  photo_url varchar(512),
  active boolean not null
);
create table rules (
  id uuid primary key,
  created_at timestamp not null,
  updated_at timestamp not null,
  name varchar(256) not null,
  type varchar(64) not null,
  expression text not null,
  active boolean not null
);

-- seed permissions
insert into permissions (id, created_at, updated_at, name, description) values
  (gen_random_uuid(), now(), now(), 'employee:read',''),
  (gen_random_uuid(), now(), now(), 'employee:create',''),
  (gen_random_uuid(), now(), now(), 'employee:update',''),
  (gen_random_uuid(), now(), now(), 'employee:delete',''),
  (gen_random_uuid(), now(), now(), 'product:read',''),
  (gen_random_uuid(), now(), now(), 'product:create',''),
  (gen_random_uuid(), now(), now(), 'product:update',''),
  (gen_random_uuid(), now(), now(), 'product:delete',''),
  (gen_random_uuid(), now(), now(), 'rule:read',''),
  (gen_random_uuid(), now(), now(), 'rule:create',''),
  (gen_random_uuid(), now(), now(), 'rule:update',''),
  (gen_random_uuid(), now(), now(), 'rule:delete',''),
  (gen_random_uuid(), now(), now(), 'rule:evaluate',''),
  (gen_random_uuid(), now(), now(), 'role:read',''),
  (gen_random_uuid(), now(), now(), 'role:create',''),
  (gen_random_uuid(), now(), now(), 'role:update',''),
  (gen_random_uuid(), now(), now(), 'role:delete',''),
  (gen_random_uuid(), now(), now(), 'permission:read',''),
  (gen_random_uuid(), now(), now(), 'permission:create',''),
  (gen_random_uuid(), now(), now(), 'permission:update',''),
  (gen_random_uuid(), now(), now(), 'permission:delete','');

insert into roles (id, created_at, updated_at, name) values (gen_random_uuid(), now(), now(), 'ADMIN');
insert into roles_permissions (role_id, permission_id) select r.id, p.id from roles r cross join permissions p where r.name='ADMIN';

-- admin / password = admin (bcrypt)
insert into users (id, created_at, updated_at, username, password, enabled)
values (gen_random_uuid(), now(), now(), 'admin', '$2a$10$y5YvE0n8L5gq3bA2c3LqUuZ4bXz4YkY3XG2K3v1gI6KQf0v0Vd4ai', true);
insert into users_roles (user_id, role_id) select u.id, r.id from users u, roles r where u.username='admin' and r.name='ADMIN';
```

---

## 10) Swagger & usage
- `GET /swagger-ui.html`
- Auth flow: `POST /api/auth/login` ⇒ use `accessToken` as `Authorization: Bearer <token>`; refresh via `/api/auth/refresh`; logout via `/api/auth/logout`.
- Securing future actions: add permission like `order:refund` and guard with `@PreAuthorize("hasAuthority('order:refund')")`.

---

### Done.

Run: `mvn spring-boot:run` (ensure Postgres is up and `application-dev.properties` is correct). Open Swagger to test endpoints.

