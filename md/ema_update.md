# EMA E-commerce — Project Architecture and File Contents

Generated on: 2025-10-07 00:23 (local)

Note: Build artifacts under target/ and launcher scripts (mvnw, mvnw.cmd) are excluded from the contents section to keep this document focused on source and configuration. The architecture tree below reflects the current repository layout (sans target/).

---

## Architecture Tree

- HELP.md
- docker-compose-pg.yml
- md/
  - ema_ecom_modulith.md
- pom.xml
- src/
  - main/
    - java/
      - com/mycroft/ema/ecom/
        - Application.java
        - auth/
          - domain/
            - Permission.java
            - RefreshToken.java
            - Role.java
            - User.java
          - package-info.java
          - repo/
            - PermissionRepository.java
            - RefreshTokenRepository.java
            - RoleRepository.java
            - UserRepository.java
          - security/
            - MethodSecurityConfig.java
            - SecurityConfig.java
          - service/
            - AccessControlService.java
            - AuthService.java
            - JwtService.java
          - web/
            - AuthController.java
            - PermissionController.java
            - RoleController.java
        - common/
          - config/
            - MessageSourceConfig.java
            - OpenApiConfig.java
          - error/
            - GlobalExceptionHandler.java
            - NotFoundException.java
          - package-info.java
          - persistence/
            - BaseEntity.java
          - web/
            - PageResponse.java
        - employees/
          - package-info.java
          - domain/
            - Employee.java
            - EmployeeType.java
          - dto/
            - EmployeeCreateDto.java
            - EmployeeMapper.java
            - EmployeeUpdateDto.java
            - EmployeeViewDto.java
          - repo/
            - EmployeeRepository.java
          - service/
            - EmployeeService.java
          - web/
            - EmployeeController.java
        - products/
          - package-info.java
          - domain/
            - Product.java
          - dto/
            - ProductCreateDto.java
            - ProductMapper.java
            - ProductUpdateDto.java
            - ProductViewDto.java
          - repo/
            - ProductRepository.java
          - service/
            - ProductService.java
          - web/
            - ProductController.java
        - rules/
          - package-info.java
          - domain/
            - Rule.java
            - RuleType.java
          - dto/
            - RuleCreateDto.java
            - RuleMapper.java
            - RuleUpdateDto.java
            - RuleViewDto.java
          - repo/
            - RuleRepository.java
          - service/
            - RuleEngine.java
            - RuleService.java
          - web/
            - RuleController.java
    - resources/
      - application-dev.properties
      - application-prod.properties
      - application.properties
      - db/migration/V1__init.sql
      - i18n/messages.properties
  - test/
    - java/
      - com/mycroft/ema/ecom/ApplicationTests.java
    - resources/
      - application.properties

---

## File Contents

### HELP.md
```
# Getting Started

### Reference Documentation
For further reference, please consider the following sections:

* [Official Apache Maven documentation](https://maven.apache.org/guides/index.html)
* [Spring Boot Maven Plugin Reference Guide](https://docs.spring.io/spring-boot/3.5.6/maven-plugin)
* [Create an OCI image](https://docs.spring.io/spring-boot/3.5.6/maven-plugin/build-image.html)
* [Spring Boot DevTools](https://docs.spring.io/spring-boot/3.5.6/reference/using/devtools.html)
* [Spring Web](https://docs.spring.io/spring-boot/3.5.6/reference/web/servlet.html)
* [Rest Repositories](https://docs.spring.io/spring-boot/3.5.6/how-to/data-access.html#howto.data-access.exposing-spring-data-repositories-as-rest)
* [Spring Modulith](https://docs.spring.io/spring-modulith/reference/)
* [Spring Security](https://docs.spring.io/spring-boot/3.5.6/reference/web/spring-security.html)
* [Flyway Migration](https://docs.spring.io/spring-boot/3.5.6/how-to/data-initialization.html#howto.data-initialization.migration-tool.flyway)
* [Java Mail Sender](https://docs.spring.io/spring-boot/3.5.6/reference/io/email.html)

### Guides
The following guides illustrate how to use some features concretely:

* [Building a RESTful Web Service](https://spring.io/guides/gs/rest-service/)
* [Serving Web Content with Spring MVC](https://spring.io/guides/gs/serving-web-content/)
* [Building REST services with Spring](https://spring.io/guides/tutorials/rest/)
* [Accessing JPA Data with REST](https://spring.io/guides/gs/accessing-data-rest/)
* [Accessing Neo4j Data with REST](https://spring.io/guides/gs/accessing-neo4j-data-rest/)
* [Accessing MongoDB Data with REST](https://spring.io/guides/gs/accessing-mongodb-data-rest/)
* [Securing a Web Application](https://spring.io/guides/gs/securing-web/)
* [Spring Boot and OAuth2](https://spring.io/guides/tutorials/spring-boot-oauth2/)
* [Authenticating a User with LDAP](https://spring.io/guides/gs/authenticating-ldap/)

### Maven Parent overrides

Due to Maven's design, elements are inherited from the parent POM to the project POM.
While most of the inheritance is fine, it also inherits unwanted elements like `<license>` and `<developers>` from the parent.
To prevent this, the project POM contains empty overrides for these elements.
If you manually switch to a different parent and actually want the inheritance, you need to remove those overrides.

```

### docker-compose-pg.yml
```
version: '3.9'
services:
  postgres:
    image: postgres:latest
    container_name: postgres-db
    restart: always
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: ema_ecom
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

### md/ema_ecom_modulith.md
```
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

**src/main/java/com/mycroft/ema/ecom/common/package-info.java**
```java
@org.springframework.modulith.ApplicationModule(displayName = "Common")
package com.mycroft.ema.ecom.common;
```

---

## Auth module

**src/main/java/com/mycroft/ema/ecom/auth/domain/Permission.java**
```java
package com.mycroft.ema.ecom.auth.domain;

import com.mycroft.ema.ecom.common.persistence.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter; import lombok.Setter;

@Entity
@Table(name="permissions")
@Getter
@Setter
public class Permission extends BaseEntity {
  @Column(unique = true, nullable = false)
  private String name; // e.g. employee:create
  private String description;
}
```

**src/main/java/com/mycroft/ema/ecom/auth/domain/Role.java**
```java
package com.mycroft.ema.ecom.auth.domain;

import com.mycroft.ema.ecom.common.persistence.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter; import lombok.Setter;

import java.util.Set;

@Entity
@Table(name="roles")
@Getter @Setter
public class Role extends BaseEntity {
  @Column(unique = true, nullable = false)
  private String name; // ADMIN, MANAGER
  @ManyToMany(fetch = FetchType.EAGER)
  @JoinTable(name="roles_permissions",
      joinColumns = @JoinColumn(name="role_id"),
      inverseJoinColumns = @JoinColumn(name="permission_id"))
  private Set<Permission> permissions = Set.of();
}
```

**src/main/java/com/mycroft/ema/ecom/auth/domain/User.java**
```java
package com.mycroft.ema.ecom.auth.domain;

import com.mycroft.ema.ecom.common.persistence.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter; import lombok.Setter;
import java.util.Set;

@Entity @Table(name="users")
@Getter @Setter
public class User extends BaseEntity {
  @Column(unique = true, nullable = false) private String username;
  @Column(nullable = false) private String password; // bcrypt
  @Column(nullable = false) private boolean enabled = true;

  @ManyToMany(fetch = FetchType.EAGER)
  @JoinTable(name="users_roles",
      joinColumns = @JoinColumn(name="user_id"),
      inverseJoinColumns = @JoinColumn(name="role_id"))
  private Set<Role> roles = Set.of();
}
```

**src/main/java/com/mycroft/ema/ecom/auth/domain/RefreshToken.java**
```java
package com.mycroft.ema.ecom.auth.domain;

import com.mycroft.ema.ecom.common.persistence.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter; import lombok.Setter;

import java.time.Instant;

@Entity @Table(name="refresh_tokens")
@Getter @Setter
public class RefreshToken extends BaseEntity {
  @Column(nullable = false, unique = true)
  private String token;
  @ManyToOne(optional = false) private User user;
  @Column(nullable = false) private Instant expiresAt;
  @Column(nullable = false) private boolean revoked = false;

  public boolean isActive(){ return !revoked && Instant.now().isBefore(expiresAt); }
}
```

**src/main/java/com/mycroft/ema/ecom/auth/package-info.java**
```java
@org.springframework.modulith.ApplicationModule(displayName = "Authentication")
package com.mycroft.ema.ecom.auth;
```

**src/main/java/com/mycroft/ema/ecom/auth/repo/PermissionRepository.java**
```java
package com.mycroft.ema.ecom.auth.repo;

import com.mycroft.ema.ecom.auth.domain.Permission;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface PermissionRepository extends JpaRepository<Permission, UUID> {
    Optional<Permission> findByName(String name);
}
```

**src/main/java/com/mycroft/ema/ecom/auth/repo/RefreshTokenRepository.java**
```java
package com.mycroft.ema.ecom.auth.repo;

import com.mycroft.ema.ecom.auth.domain.RefreshToken;
import com.mycroft.ema.ecom.auth.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {
    Optional<RefreshToken> findByToken(String token);
    long deleteByUser(User user);
}
```

**src/main/java/com/mycroft/ema/ecom/auth/repo/RoleRepository.java**
```java
package com.mycroft.ema.ecom.auth.repo;

import com.mycroft.ema.ecom.auth.domain.Role;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface RoleRepository extends JpaRepository<Role, UUID> {
    Optional<Role> findByName(String name);
}
```

**src/main/java/com/mycroft/ema/ecom/auth/repo/UserRepository.java**
```java
package com.mycroft.ema.ecom.auth.repo;

import com.mycroft.ema.ecom.auth.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByUsername(String username);
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

**src/main/java/com/mycroft/ema/ecom/auth/security/SecurityConfig.java**
```java
package com.mycroft.ema.ecom.auth.security;

import com.mycroft.ema.ecom.auth.repo.UserRepository;
import com.mycroft.ema.ecom.auth.service.AccessControlService;
import com.mycroft.ema.ecom.auth.service.JwtService;
import com.mycroft.ema.ecom.auth.domain.User;
import jakarta.servlet.FilterChain; import jakarta.servlet.ServletException; import jakarta.servlet.http.HttpServletRequest; import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean; import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder; import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain; import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException; import java.util.Collection;

@Configuration
public class SecurityConfig {
  @Bean PasswordEncoder passwordEncoder(){ return new BCryptPasswordEncoder(); }

  @Bean
  SecurityFilterChain filterChain(HttpSecurity http, JwtAuthenticationFilter jwtFilter) throws Exception {
    http.csrf(csrf -> csrf.disable());
    http.sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS));
    http.authorizeHttpRequests(auth -> auth
        .requestMatchers("/v3/api-docs/**","/swagger-ui/**","/swagger-ui.html","/actuator/health").permitAll()
        .requestMatchers(HttpMethod.POST,"/api/auth/login","/api/auth/refresh").permitAll()
        .anyRequest().authenticated());
    http.addFilterBefore(jwtFilter, org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter.class);
    return http.build();
  }

  @Bean JwtAuthenticationFilter jwtAuthenticationFilter(JwtService jwt, UserRepository users, AccessControlService ac){ return new JwtAuthenticationFilter(jwt, users, ac); }

  static class JwtAuthenticationToken extends AbstractAuthenticationToken {
    private final User principal; JwtAuthenticationToken(User user, Collection<SimpleGrantedAuthority> auth){ super(auth); this.principal=user; setAuthenticated(true);}
    @Override public Object getCredentials(){ return ""; }
    @Override public Object getPrincipal(){ return principal; }
  }

  static class JwtAuthenticationFilter extends OncePerRequestFilter {
    private final JwtService jwt; private final UserRepository users; private final AccessControlService ac;
    JwtAuthenticationFilter(JwtService jwt, UserRepository users, AccessControlService ac){ this.jwt=jwt; this.users=users; this.ac=ac; }
    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain) throws ServletException, IOException {
      var header = req.getHeader("Authorization");
      if(header != null && header.startsWith("Bearer ")){
        var token = header.substring(7);
        try{
          var decoded = jwt.verify(token);
          var userId = java.util.UUID.fromString(decoded.getSubject());
          var user = users.findById(userId).orElse(null);
          if(user != null && user.isEnabled()){
            var permissions = ac.permissions(user).stream().map(SimpleGrantedAuthority::new).toList();
            var roles = user.getRoles().stream().map(r -> new SimpleGrantedAuthority("ROLE_"+r.getName())).toList();
            var authorities = new java.util.ArrayList<>(permissions); authorities.addAll(roles);
            var auth = new JwtAuthenticationToken(user, authorities);
            org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(auth);
          }
        }catch (Exception ignored){ }
      }
      chain.doFilter(req, res);
    }
  }
}
```

**src/main/java/com/mycroft/ema/ecom/auth/service/AccessControlService.java**
```java
package com.mycroft.ema.ecom.auth.service;

import com.mycroft.ema.ecom.auth.domain.User;
import org.springframework.stereotype.Service;
import java.util.Set; import java.util.stream.Collectors;

@Service
public class AccessControlService {
  public Set<String> permissions(User u) {
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

import java.time.Instant; import java.util.UUID;

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

  public record LoginRequest(String username, String password) {}
  public record TokenPair(String accessToken, String refreshToken) {}

  @Transactional
  public TokenPair login(LoginRequest req){
    var user = users.findByUsername(req.username()).orElseThrow(()-> new NotFoundException("User not found"));
    if (!user.isEnabled() || !encoder.matches(req.password(), user.getPassword())) throw new IllegalArgumentException("Bad credentials");
    var access = jwt.generateAccessToken(user);
    var refresh = new RefreshToken();
    refresh.setToken(UUID.randomUUID().toString());
    refresh.setUser(user);
    refresh.setExpiresAt(Instant.now().plusSeconds(60L*60L*24L*7L));
    refreshTokens.save(refresh);
    return new TokenPair(access, refresh.getToken());
  }

  @Transactional
  public TokenPair refresh(String refreshToken){
    var rt = refreshTokens.findByToken(refreshToken).orElseThrow(()->new IllegalArgumentException("Invalid refresh token"));
    if(!rt.isActive()) throw new IllegalArgumentException("Refresh token expired/revoked");
    var user = rt.getUser();
    return new TokenPair(jwt.generateAccessToken(user), refreshToken);
  }

  @Transactional
  public void logout(String refreshToken){ refreshTokens.findByToken(refreshToken)
          .ifPresent(rt -> { rt.setRevoked(true); refreshTokens.save(rt); });
  }

}
```

**src/main/java/com/mycroft/ema/ecom/auth/service/JwtService.java**
```java
package com.mycroft.ema.ecom.auth.service;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.mycroft.ema.ecom.auth.domain.Role;
import com.mycroft.ema.ecom.auth.domain.User;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Date;

@Service
public class JwtService {

  private final Algorithm algorithm;
  private final String issuer;
  private final long accessTtlSeconds;

  public JwtService(@Value("${app.jwt.secret}") String secret, @Value("${app.jwt.issuer:ema-ecom}") String issuer ,
                    @Value("${app.jwt.access-ttl-seconds:900}") long accessTtlSeconds) {
    this.algorithm = Algorithm.HMAC256(secret);
    this.issuer = issuer; this.accessTtlSeconds = accessTtlSeconds;
  }

  public String generateAccessToken(User user){
    var now = Instant.now();
    return JWT.create()
        .withIssuer(issuer)
        .withSubject(user.getId().toString())
        .withClaim("username", user.getUsername())
        .withClaim("roles", user.getRoles().stream().map(Role::getName).toList())
        .withIssuedAt(Date.from(now))
        .withExpiresAt(Date.from(now.plusSeconds(accessTtlSeconds)))
        .sign(algorithm);
  }

  public com.auth0.jwt.interfaces.DecodedJWT verify(String token){
    return JWT.require(algorithm).withIssuer(issuer).build().verify(token);
  }

}
```

**src/main/java/com/mycroft/ema/ecom/auth/web/AuthController.java**
```java
package com.mycroft.ema.ecom.auth.web;

import com.mycroft.ema.ecom.auth.service.AuthService;
import org.springframework.http.ResponseEntity; import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/auth")
public class AuthController {

  private final AuthService auth;

  public AuthController(AuthService auth){
    this.auth = auth;
  }

  @PostMapping("/login")
  public ResponseEntity<AuthService.TokenPair> login(@RequestBody AuthService.LoginRequest req){
    return ResponseEntity.ok(auth.login(req));
  }

  public record RefreshRequest(String refreshToken){}

  @PostMapping("/refresh")
  public ResponseEntity<AuthService.TokenPair> refresh(@RequestBody RefreshRequest req){
    return ResponseEntity.ok(auth.refresh(req.refreshToken()));
  }

  @PostMapping("/logout")
  public ResponseEntity<Void> logout(@RequestBody RefreshRequest req){
    auth.logout(req.refreshToken());
    return ResponseEntity.noContent().build();
  }

}
```

**src/main/java/com/mycroft/ema/ecom/auth/web/PermissionController.java**
```java
package com.mycroft.ema.ecom.auth.web;

import com.mycroft.ema.ecom.auth.domain.Permission; import com.mycroft.ema.ecom.auth.repo.PermissionRepository;
import com.mycroft.ema.ecom.common.error.NotFoundException;
import org.springframework.security.access.prepost.PreAuthorize; import org.springframework.web.bind.annotation.*;
import java.util.List; import java.util.UUID;

@RestController @RequestMapping("/api/permissions")
public class PermissionController {

  private final PermissionRepository perms;

  public PermissionController(PermissionRepository perms){
    this.perms=perms;
  }

  @GetMapping
  @PreAuthorize("hasAuthority('permission:read')")
  public List<Permission> findAll(){
    return perms.findAll();
  }

  @PostMapping
  @PreAuthorize("hasAuthority('permission:create')")
  public Permission create(@RequestBody Permission p){
    return perms.save(p);
  }

  @PutMapping("/{id}")
  @PreAuthorize("hasAuthority('permission:update')")
  public Permission update(@PathVariable UUID id, @RequestBody Permission p){
    var existing = perms.findById(id).orElseThrow(() -> new NotFoundException("Permission not found"));
    existing.setName(p.getName());
    existing.setDescription(p.getDescription());
    return perms.save(existing);
  }

  @DeleteMapping("/{id}")
  @PreAuthorize("hasAuthority('permission:delete')")
  public void delete(@PathVariable UUID id){
    perms.deleteById(id);
  }
}
```

**src/main/java/com/mycroft/ema/ecom/auth/web/RoleController.java**
```java
package com.mycroft.ema.ecom.auth.web;

import com.mycroft.ema.ecom.auth.domain.Role; import com.mycroft.ema.ecom.auth.repo.RoleRepository;
import com.mycroft.ema.ecom.common.error.NotFoundException;
import org.springframework.security.access.prepost.PreAuthorize; import org.springframework.web.bind.annotation.*;
import java.util.List; import java.util.UUID;

@RestController @RequestMapping("/api/roles")
public class RoleController {

  private final RoleRepository roles;

  public RoleController(RoleRepository roles){
    this.roles=roles;
  }

  @GetMapping @PreAuthorize("hasAuthority('role:read')")
  public List<Role> findAll(){ return roles.findAll(); }

  @PostMapping @PreAuthorize("hasAuthority('role:create')")
  public Role create(@RequestBody Role r){ return roles.save(r); }

  @PutMapping("/{id}") @PreAuthorize("hasAuthority('role:update')")
  public Role update(@PathVariable UUID id, @RequestBody Role r){
    var existing = roles.findById(id).orElseThrow(() -> new NotFoundException("Role not found"));
    existing.setName(r.getName());
    existing.setPermissions(r.getPermissions());
    return roles.save(existing);
  }

  @DeleteMapping("/{id}") @PreAuthorize("hasAuthority('role:delete')")
  public void delete(@PathVariable UUID id){ roles.deleteById(id); }
}
```

---

## Employees module

**src/main/java/com/mycroft/ema/ecom/employees/package-info.java**
```java
@org.springframework.modulith.ApplicationModule(displayName = "Employees")
package com.mycroft.ema.ecom.employees;
```

**src/main/java/com/mycroft/ema/ecom/employees/domain/Employee.java**
```java
package com.mycroft.ema.ecom.employees.domain;

import com.mycroft.ema.ecom.common.persistence.BaseEntity;
import jakarta.persistence.*; import lombok.Getter; import lombok.Setter;

@Entity
@Table(name="employees")
@Getter
@Setter
public class Employee extends BaseEntity {
  @Column(nullable=false)
  private String firstName;

  @Column(nullable=false)
  private String lastName;

  @Enumerated(EnumType.STRING)
  @Column(nullable=false)
  private EmployeeType type;

  private String companyName;
  private String phone;
  private String email;
}
```

**src/main/java/com/mycroft/ema/ecom/employees/domain/EmployeeType.java**
```java
package com.mycroft.ema.ecom.employees.domain;
public enum EmployeeType { DELIVERY_COMPANY, INDIVIDUAL }
```

**src/main/java/com/mycroft/ema/ecom/employees/dto/EmployeeCreateDto.java**
```java
package com.mycroft.ema.ecom.employees.dto;

import com.mycroft.ema.ecom.employees.domain.EmployeeType;
import jakarta.validation.constraints.*;

public record EmployeeCreateDto(
        @NotBlank String firstName,
        @NotBlank String lastName,
        @NotNull EmployeeType type,
        String companyName,
        @Pattern(regexp="^\\+?[0-9 .-]{6,}$", message="invalid phone") String phone,
        @Email String email
) {}
```

**src/main/java/com/mycroft/ema/ecom/employees/dto/EmployeeUpdateDto.java**
```java
package com.mycroft.ema.ecom.employees.dto;

import com.mycroft.ema.ecom.employees.domain.EmployeeType;
import jakarta.validation.constraints.*;

public record EmployeeUpdateDto(
        @NotBlank String firstName,
        @NotBlank String lastName,
        @NotNull EmployeeType type,
        String companyName,
        @Pattern(regexp="^\\+?[0-9 .-]{6,}$") String phone,
        @Email String email
) {}
```

**src/main/java/com/mycroft/ema/ecom/employees/dto/EmployeeViewDto.java**
```java
package com.mycroft.ema.ecom.employees.dto;

import com.mycroft.ema.ecom.employees.domain.EmployeeType;
import java.util.UUID;

public record EmployeeViewDto(
        UUID id,
        String firstName,
        String lastName,
        EmployeeType type,
        String companyName,
        String phone,
        String email
) {}
```

**src/main/java/com/mycroft/ema/ecom/employees/dto/EmployeeMapper.java**
```java
package com.mycroft.ema.ecom.employees.dto;

import com.mycroft.ema.ecom.employees.domain.Employee;
import org.mapstruct.*;

@Mapper(componentModel = "spring")
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
import org.springframework.data.jpa.repository.*;
import org.springframework.data.jpa.domain.Specification;
import java.util.UUID;

public interface EmployeeRepository extends JpaRepository<Employee, UUID>, JpaSpecificationExecutor<Employee> {

  static Specification<Employee> firstNameLike(String q){
    return (root, cq, cb)
            -> q==null?null:cb.like(cb.lower(root.get("firstName")), "%"+q.toLowerCase()+"%");
  }

  static Specification<Employee> lastNameLike(String q){
    return (root, cq, cb)
            -> q==null?null:cb.like(cb.lower(root.get("lastName")), "%"+q.toLowerCase()+"%");
  }

  static Specification<Employee> typeEq(com.mycroft.ema.ecom.employees.domain.EmployeeType type){
    return (root, cq, cb)
            -> type==null?null:cb.equal(root.get("type"), type);
  }

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
        Specification<Employee> spec = Specification.allOf(
                Specification.anyOf(firstNameLike(q), lastNameLike(q)),
                typeEq(type)
        );
        return repo.findAll(spec, pageable).map(mapper::toView);
    }

    public EmployeeViewDto create(EmployeeCreateDto dto) {
        return mapper.toView(repo.save(mapper.toEntity(dto)));
    }

    public EmployeeViewDto update(UUID id, EmployeeUpdateDto dto) {
        var e = repo.findById(id).orElseThrow(
                () -> new NotFoundException("Employee not found"));
        mapper.updateEntity(dto, e);
        return mapper.toView(repo.save(e));
    }

    public void delete(UUID id) {
        repo.deleteById(id);
    }

    public EmployeeViewDto get(UUID id) {
        return repo.findById(id).map(mapper::toView)
                .orElseThrow(() -> new NotFoundException("Employee not found"));
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
    public PageResponse<EmployeeViewDto> search(@RequestParam(required = false) String q,
                                                @RequestParam(required = false) EmployeeType type,
                                                Pageable pageable) {
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

## Products module

**src/main/java/com/mycroft/ema/ecom/products/package-info.java**
```java
@org.springframework.modulith.ApplicationModule(displayName = "Products")
package com.mycroft.ema.ecom.products;
```

**src/main/java/com/mycroft/ema/ecom/products/domain/Product.java**
```java
package com.mycroft.ema.ecom.products.domain;

import com.mycroft.ema.ecom.common.persistence.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Table(name = "products")
@Getter
@Setter
public class Product extends BaseEntity {
  @Column(nullable = false)
  private String name;

  private String description;

  @Column(nullable = false)
  private BigDecimal price;

  private String photoUrl; // single photo

  private boolean active = true;
}
```

**src/main/java/com/mycroft/ema/ecom/products/dto/ProductCreateDto.java**
```java
package com.mycroft.ema.ecom.products.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;

public record ProductCreateDto(
        @NotBlank
        String name,
        @DecimalMin(value="0.0", inclusive=false)
        BigDecimal price,
        String description,
        String photoUrl,
        Boolean active
) {}
```

**src/main/java/com/mycroft/ema/ecom/products/dto/ProductUpdateDto.java**
```java
package com.mycroft.ema.ecom.products.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;

public record ProductUpdateDto(
        @NotBlank
        String name,
        @DecimalMin(value="0.0", inclusive=false)
        BigDecimal price,
        String description,
        String photoUrl,
        Boolean active
) {}
```

**src/main/java/com/mycroft/ema/ecom/products/dto/ProductViewDto.java**
```java
package com.mycroft.ema.ecom.products.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record ProductViewDto(
        UUID id,
        String name,
        String description,
        BigDecimal price,
        String photoUrl,
        boolean active
) {}
```

**src/main/java/com/mycroft/ema/ecom/products/dto/ProductMapper.java**
```java
package com.mycroft.ema.ecom.products.dto;

import com.mycroft.ema.ecom.products.domain.Product;
import org.mapstruct.*;

@Mapper(componentModel = "spring")
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

import com.mycroft.ema.ecom.products.domain.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.UUID;

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
    Specification<Product> byName = (root, cq, cb) -> q == null ? null : cb.like(cb.lower(root.get("name")), "%" + q.toLowerCase() + "%");
    Specification<Product> byActive = (root, cq, cb) -> active == null ? null : cb.equal(root.get("active"), active);
    Specification<Product> spec = Specification.allOf(byName, byActive);
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
  public PageResponse<ProductViewDto> search(@RequestParam(required = false) String q,
                                             @RequestParam(required = false) Boolean active,
                                             Pageable pageable) {
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

## Rules module

**src/main/java/com/mycroft/ema/ecom/rules/package-info.java**
```java
@org.springframework.modulith.ApplicationModule(displayName = "Rules")
package com.mycroft.ema.ecom.rules;
```

**src/main/java/com/mycroft/ema/ecom/rules/domain/Rule.java**
```java
package com.mycroft.ema.ecom.rules.domain;

import com.mycroft.ema.ecom.common.persistence.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "rules")
@Getter
@Setter
public class Rule extends BaseEntity {
  @Column(nullable = false)
  private String name;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private RuleType type;

  @Column(nullable = false, length = 4000)
  private String expression;

  private boolean active = true;
}
```

**src/main/java/com/mycroft/ema/ecom/rules/domain/RuleType.java**
```java
package com.mycroft.ema.ecom.rules.domain;

public enum RuleType { REVENUE_FORMULA, DISCOUNT_FORMULA, CUSTOM_GROOVY }
```

**src/main/java/com/mycroft/ema/ecom/rules/dto/RuleCreateDto.java**
```java
package com.mycroft.ema.ecom.rules.dto;

import com.mycroft.ema.ecom.rules.domain.RuleType;
import jakarta.validation.constraints.*;

public record RuleCreateDto(
    @NotBlank String name,
    @NotNull RuleType type,
    @NotBlank String expression,
    Boolean active
) {}
```

**src/main/java/com/mycroft/ema/ecom/rules/dto/RuleUpdateDto.java**
```java
package com.mycroft.ema.ecom.rules.dto;

import com.mycroft.ema.ecom.rules.domain.RuleType;
import jakarta.validation.constraints.*;

public record RuleUpdateDto(
    @NotBlank String name,
    @NotNull RuleType type,
    @NotBlank String expression,
    Boolean active
) {}
```

**src/main/java/com/mycroft/ema/ecom/rules/dto/RuleViewDto.java**
```java
package com.mycroft.ema.ecom.rules.dto;

import com.mycroft.ema.ecom.rules.domain.RuleType;
import java.util.UUID;

public record RuleViewDto(
    UUID id,
    String name,
    RuleType type,
    String expression,
    boolean active
) {}
```

**src/main/java/com/mycroft/ema/ecom/rules/dto/RuleMapper.java**
```java
package com.mycroft.ema.ecom.rules.dto;

import com.mycroft.ema.ecom.rules.domain.Rule;
import org.mapstruct.*;

@Mapper(componentModel = "spring")
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

import com.mycroft.ema.ecom.rules.domain.Rule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.UUID;

public interface RuleRepository extends JpaRepository<Rule, UUID>, JpaSpecificationExecutor<Rule> {}
```

**src/main/java/com/mycroft/ema/ecom/rules/service/RuleEngine.java**
```java
package com.mycroft.ema.ecom.rules.service;

import com.mycroft.ema.ecom.rules.domain.Rule;
import org.springframework.stereotype.Component;

import java.util.Map;

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

import com.mycroft.ema.ecom.common.error.NotFoundException;
import com.mycroft.ema.ecom.rules.domain.Rule;
import com.mycroft.ema.ecom.rules.dto.*;
import com.mycroft.ema.ecom.rules.repo.RuleRepository;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class RuleService {
  private final RuleRepository repo; private final RuleMapper mapper; private final RuleEngine engine;
  public RuleService(RuleRepository repo, RuleMapper mapper, RuleEngine engine){ this.repo=repo; this.mapper=mapper; this.engine=engine; }
  public Page<RuleViewDto> search(String q, Boolean active, Pageable pageable){
    Specification<Rule> byName = (root, cq, cb) -> q==null? null : cb.like(cb.lower(root.get("name")), "%"+q.toLowerCase()+"%");
    Specification<Rule> byActive = (root, cq, cb) -> active==null?null:cb.equal(root.get("active"), active);
    Specification<Rule> spec = Specification.allOf(byName, byActive);
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

import com.mycroft.ema.ecom.common.web.PageResponse;
import com.mycroft.ema.ecom.rules.dto.*;
import com.mycroft.ema.ecom.rules.service.RuleService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/rules")
public class RuleController {

  private final RuleService service;

  public RuleController(RuleService service){
    this.service=service;
  }

  @GetMapping
  @PreAuthorize("hasAuthority('rule:read')")
  public PageResponse<RuleViewDto> search(@RequestParam(required=false) String q,
                                          @RequestParam(required=false) Boolean active, Pageable pageable){
    return PageResponse.of(service.search(q, active, pageable));
  }

  @GetMapping("/{id}")
  @PreAuthorize("hasAuthority('rule:read')")
  public RuleViewDto get(@PathVariable UUID id){
    return service.get(id);
  }

  @PostMapping
  @PreAuthorize("hasAuthority('rule:create')")
  public RuleViewDto create(@Valid @RequestBody RuleCreateDto dto){
    return service.create(dto);
  }

  @PutMapping("/{id}")
  @PreAuthorize("hasAuthority('rule:update')")
  public RuleViewDto update(@PathVariable UUID id, @Valid @RequestBody RuleUpdateDto dto){
    return service.update(id, dto);
  }

  @DeleteMapping("/{id}")
  @PreAuthorize("hasAuthority('rule:delete')")
  public void delete(@PathVariable UUID id){
    service.delete(id);
  }

  @PostMapping("/{id}/evaluate")
  @PreAuthorize("hasAuthority('rule:evaluate')")
  public Map<String,Object> evaluate(@PathVariable UUID id, @RequestBody Map<String,Object> facts){
    return Map.of("status","not-implemented");
  }

}
```

---

## Root application and configuration

**src/main/java/com/mycroft/ema/ecom/Application.java**
```java
package com.mycroft.ema.ecom;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.modulith.Modulithic;

@SpringBootApplication
@Modulithic(sharedModules = "common")
public class Application {
  public static void main(String[] args) {
    SpringApplication.run(Application.class, args);
  }
}
```

**src/main/resources/application.properties**
```properties
spring.application.name=ema-ecom
spring.profiles.active=dev

spring.jpa.hibernate.ddl-auto=validate
spring.jpa.open-in-view=false
spring.jpa.properties.hibernate.format_sql=true
spring.jpa.properties.hibernate.connection.provider_disables_autocommit=true

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
spring.datasource.driver-class-name=org.postgresql.Driver
app.jwt.secret=dev-change-me

# Enable migrations and schema validation in dev so DB is created automatically
spring.flyway.enabled=true
spring.flyway.validate-on-migrate=true
spring.flyway.clean-disabled=true
spring.jpa.hibernate.ddl-auto=validate
spring.jpa.database-platform=org.hibernate.dialect.PostgreSQLDialect

# Allow Hibernate to access JDBC metadata (required when DB is up)
spring.jpa.properties.hibernate.boot.allow_jdbc_metadata_access=true

# HikariCP explicit settings to avoid 'unknown' diagnostics
spring.datasource.hikari.auto-commit=false
spring.datasource.hikari.transaction-isolation=TRANSACTION_READ_COMMITTED
spring.datasource.hikari.minimum-idle=0
spring.datasource.hikari.maximum-pool-size=5
spring.datasource.hikari.pool-name=HikariPool

# Don’t fail fast if the DB is unavailable during bean creation
spring.datasource.hikari.initializationFailTimeout=0
```

**src/main/resources/application-prod.properties**
```properties
spring.datasource.url=${DB_URL}
spring.datasource.username=${DB_USER}
spring.datasource.password=${DB_PASS}
spring.datasource.driver-class-name=${DB_DRIVER:org.postgresql.Driver}

# HikariCP settings (override via env if needed)
spring.datasource.hikari.auto-commit=${DB_AUTOCOMMIT:false}
spring.datasource.hikari.transaction-isolation=${DB_TX_ISOLATION:TRANSACTION_READ_COMMITTED}
spring.datasource.hikari.minimum-idle=${DB_MIN_IDLE:2}
spring.datasource.hikari.maximum-pool-size=${DB_MAX_POOL_SIZE:10}
spring.datasource.hikari.pool-name=${DB_POOL_NAME:emaEcomHikariPool}

# Flyway best-practice: separate migration credentials (fallback to app creds)
 spring.flyway.enabled=true
 spring.flyway.url=${FLYWAY_URL:${DB_URL}}
 spring.flyway.user=${FLYWAY_USER:${DB_USER}}
 spring.flyway.password=${FLYWAY_PASSWORD:${DB_PASS}}
 spring.flyway.locations=classpath:db/migration
 spring.flyway.validate-on-migrate=true
 spring.flyway.clean-disabled=true
 spring.flyway.out-of-order=false

app.jwt.secret=${JWT_SECRET}
```

**src/main/resources/i18n/messages.properties**
```properties
employee.notfound=Employee not found
product.notfound=Product not found
rule.notfound=Rule not found
```

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

## Tests

**src/test/java/com/mycroft/ema/ecom/ApplicationTests.java**
```java
package com.mycroft.ema.ecom;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
class ApplicationTests {

	@Test
	void contextLoads() {
	}

}
```

**src/test/resources/application.properties**
```properties
# Test overrides to allow context to load without a running DB
spring.profiles.active=test
spring.flyway.enabled=false
spring.jpa.hibernate.ddl-auto=none
spring.datasource.url=jdbc:h2:mem:ema_ecom;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DATABASE_TO_UPPER=false
spring.datasource.username=sa
spring.datasource.password=
spring.datasource.driver-class-name=org.h2.Driver
spring.jpa.database-platform=org.hibernate.dialect.H2Dialect
app.jwt.secret=test-secret
```

---

## Build configuration

**pom.xml**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
	xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
	<modelVersion>4.0.0</modelVersion>
	<parent>
		<groupId>org.springframework.boot</groupId>
		<artifactId>spring-boot-starter-parent</artifactId>
		<version>3.5.6</version>
		<relativePath/> <!-- lookup parent from repository -->
	</parent>
	<groupId>com.mycroft</groupId>
	<artifactId>ema.ecom</artifactId>
	<version>0.0.1-SNAPSHOT</version>
	<name>ema.ecom</name>
	<description>Ema E-commerce App</description>
	<url/>
	<licenses>
		<license/>
	</licenses>
	<developers>
		<developer/>
	</developers>
	<scm>
		<connection/>
		<developerConnection/>
		<tag/>
		<url/>
	</scm>
	<properties>
		<java.version>21</java.version>
		<spring-modulith.version>1.4.1</spring-modulith.version>
	</properties>
	<dependencies>
		<!-- Existing starters -->
		<dependency>
			<groupId>org.springframework.boot</groupId>
			<artifactId>spring-boot-starter-data-rest</artifactId>
		</dependency>
		<dependency>
			<groupId>org.springframework.boot</groupId>
			<artifactId>spring-boot-starter-mail</artifactId>
		</dependency>
		<dependency>
			<groupId>org.springframework.boot</groupId>
			<artifactId>spring-boot-starter-security</artifactId>
		</dependency>
		<dependency>
			<groupId>org.springframework.boot</groupId>
			<artifactId>spring-boot-starter-web</artifactId>
		</dependency>
		<dependency>
			<groupId>org.flywaydb</groupId>
			<artifactId>flyway-core</artifactId>
		</dependency>
		<dependency>
			<groupId>org.flywaydb</groupId>
			<artifactId>flyway-database-postgresql</artifactId>
		</dependency>
		<dependency>
			<groupId>org.springframework.modulith</groupId>
			<artifactId>spring-modulith-starter-core</artifactId>
		</dependency>

		<!-- Added per scaffold -->
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

		<!-- Dev & runtime -->
		<dependency>
			<groupId>org.springframework.boot</groupId>
			<artifactId>spring-boot-devtools</artifactId>
			<scope>runtime</scope>
			<optional>true</optional>
		</dependency>
		<dependency>
			<groupId>org.postgresql</groupId>
			<artifactId>postgresql</artifactId>
			<scope>runtime</scope>
		</dependency>
		<dependency>
			<groupId>org.projectlombok</groupId>
			<artifactId>lombok</artifactId>
			<optional>true</optional>
		</dependency>

		<!-- Tests -->
		<dependency>
			<groupId>org.springframework.boot</groupId>
			<artifactId>spring-boot-starter-test</artifactId>
			<scope>test</scope>
		</dependency>
		<dependency>
			<groupId>org.springframework.modulith</groupId>
			<artifactId>spring-modulith-starter-test</artifactId>
			<scope>test</scope>
		</dependency>
		<dependency>
			<groupId>org.springframework.security</groupId>
			<artifactId>spring-security-test</artifactId>
			<scope>test</scope>
		</dependency>
		<dependency>
			<groupId>com.h2database</groupId>
			<artifactId>h2</artifactId>
			<scope>test</scope>
		</dependency>
	</dependencies>
	<dependencyManagement>
		<dependencies>
			<dependency>
				<groupId>org.springframework.modulith</groupId>
				<artifactId>spring-modulith-bom</artifactId>
				<version>${spring-modulith.version}</version>
				<type>pom</type>
				<scope>import</scope>
			</dependency>
		</dependencies>
	</dependencyManagement>

	<build>
		<plugins>
			<plugin>
				<groupId>org.apache.maven.plugins</groupId>
				<artifactId>maven-compiler-plugin</artifactId>
				<configuration>
					<source>21</source>
					<target>21</target>
					<parameters>true</parameters>
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
				</configuration>
			</plugin>
			<plugin>
				<groupId>org.springframework.boot</groupId>
				<artifactId>spring-boot-maven-plugin</artifactId>
				<configuration>
					<excludes>
						<exclude>
							<groupId>org.projectlombok</groupId>
							<artifactId>lombok</artifactId>
						</exclude>
					</excludes>
				</configuration>
			</plugin>
		</plugins>
	</build>

</project>
```

---

End of report.
