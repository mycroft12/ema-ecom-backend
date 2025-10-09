# Ecom Management App – Full-stack Scaffold

A deployable, single-package e‑commerce management web app scaffold using **Spring Boot 3.5.6** (Java 21+) and **Angular 19**. Includes:

- Dynamic RBAC (roles/profils + permissions) and employee types
- Product management module (CRUD skeleton)
- KPI Rules engine skeleton (user-defined rules evaluated via sandboxed SpEL)
- **One-package deployment** options:
  - **Fat JAR**: Angular build embedded in Spring Boot `resources/static`
  - **Docker image**: single container running the fat JAR
  - **Docker Compose**: app + Postgres
- Database migrations via **Flyway**

> **Note**: This is a *socle* (foundation). Replace placeholders with your domain specifics as you iterate.

---

## 1) Repository Layout

```
ema-ecom/
├─ backend/
│  ├─ pom.xml
│  └─ src/
│     ├─ main/
│     │  ├─ java/com/mycroft/ecom/...
│     │  ├─ resources/
│     │  │  ├─ application.yml
│     │  │  └─ db/migration/ (Flyway)
│     │  └─ resources-static/  (populated by Angular build)
│     └─ test/java/...
├─ frontend/
│  ├─ angular.json
│  ├─ package.json
│  ├─ tsconfig.json
│  └─ src/
│     ├─ app/
│     │  ├─ core/ (auth, guards, api-client)
│     │  ├─ features/
│     │  │  ├─ products/
│     │  │  ├─ employees/
│     │  │  ├─ profils/
│     │  │  └─ kpi-rules/
│     │  ├─ shared/
│     │  └─ app.routes.ts
│     └─ index.html
├─ pom.xml  (parent aggregator)
├─ Dockerfile
├─ docker-compose.yml
├─ build-and-package.sh
└─ README.md
```

---

## 2) Parent `pom.xml` (Aggregator)

```xml
<!-- ema-ecom/pom.xml -->
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>
  <groupId>com.mycroft</groupId>
  <artifactId>ema-ecom-parent</artifactId>
  <version>0.0.1-SNAPSHOT</version>
  <packaging>pom</packaging>

  <modules>
    <module>backend</module>
  </modules>

  <properties>
    <java.version>21</java.version>
    <spring-boot.version>3.5.6</spring-boot.version>
    <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
    <node.version>20.17.0</node.version>
    <angular.dist.dir>${project.basedir}/frontend/dist/ema-ecom</angular.dist.dir>
  </properties>

  <dependencyManagement>
    <dependencies>
      <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-dependencies</artifactId>
        <version>${spring-boot.version}</version>
        <type>pom</type>
        <scope>import</scope>
      </dependency>
    </dependencies>
  </dependencyManagement>
</project>
```

---

## 3) Backend `pom.xml` (Spring Boot + Frontend bundling)

```xml
<!-- ema-ecom/backend/pom.xml -->
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>
  <parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.5.6</version>
    <relativePath/>
  </parent>

  <groupId>com.mycroft</groupId>
  <artifactId>ema-ecom</artifactId>
  <version>0.0.1-SNAPSHOT</version>
  <name>ema-ecom</name>
  <description>Ema E-commerce App</description>

  <properties>
    <java.version>21</java.version>
    <frontend.basedir>${project.basedir}/../frontend</frontend.basedir>
    <frontend.distdir>${frontend.basedir}/dist/ema-ecom</frontend.distdir>
  </properties>

  <dependencies>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-security</artifactId>
    </dependency>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-validation</artifactId>
    </dependency>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-data-jpa</artifactId>
    </dependency>
    <dependency>
      <groupId>org.flywaydb</groupId>
      <artifactId>flyway-core</artifactId>
    </dependency>
    <dependency>
      <groupId>org.postgresql</groupId>
      <artifactId>postgresql</artifactId>
      <scope>runtime</scope>
    </dependency>
    <!-- Expression evaluation (SpEL is in Spring). Optionally add CEL later. -->
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-actuator</artifactId>
    </dependency>
    <dependency>
      <groupId>org.springdoc</groupId>
      <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
      <version>2.6.0</version>
    </dependency>
    <dependency>
      <groupId>com.fasterxml.jackson.core</groupId>
      <artifactId>jackson-databind</artifactId>
    </dependency>
    <dependency>
      <groupId>jakarta.annotation</groupId>
      <artifactId>jakarta.annotation-api</artifactId>
    </dependency>
    <dependency>
      <groupId>org.projectlombok</groupId>
      <artifactId>lombok</artifactId>
      <optional>true</optional>
    </dependency>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-test</artifactId>
      <scope>test</scope>
    </dependency>
  </dependencies>

  <build>
    <plugins>
      <!-- Build Angular then copy the dist into resources-static before packaging -->
      <plugin>
        <groupId>org.codehaus.mojo</groupId>
        <artifactId>exec-maven-plugin</artifactId>
        <version>3.5.0</version>
        <executions>
          <execution>
            <id>npm-ci</id>
            <phase>generate-resources</phase>
            <goals><goal>exec</goal></goals>
            <configuration>
              <workingDirectory>${frontend.basedir}</workingDirectory>
              <executable>npm</executable>
              <arguments><argument>ci</argument></arguments>
            </configuration>
          </execution>
          <execution>
            <id>ng-build</id>
            <phase>generate-resources</phase>
            <goals><goal>exec</goal></goals>
            <configuration>
              <workingDirectory>${frontend.basedir}</workingDirectory>
              <executable>npx</executable>
              <arguments>
                <argument>ng</argument>
                <argument>build</argument>
                <argument>--configuration=production</argument>
              </arguments>
            </configuration>
          </execution>
        </executions>
      </plugin>

      <plugin>
        <groupId>org.apache.maven.plugins</groupId>
        <artifactId>maven-resources-plugin</artifactId>
        <version>3.3.1</version>
        <executions>
          <execution>
            <id>copy-frontend</id>
            <phase>process-resources</phase>
            <goals><goal>copy-resources</goal></goals>
            <configuration>
              <outputDirectory>${project.build.outputDirectory}/static/</outputDirectory>
              <resources>
                <resource>
                  <directory>${frontend.distdir}</directory>
                  <filtering>false</filtering>
                </resource>
              </resources>
            </configuration>
          </execution>
        </executions>
      </plugin>

      <plugin>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-maven-plugin</artifactId>
        <configuration>
          <image>
            <name>ghcr.io/mycroft/ema-ecom:${project.version}</name>
          </image>
        </configuration>
      </plugin>
    </plugins>
  </build>
</project>
```

---

## 4) Backend Code Skeleton

### 4.1 Application Entry
```java
// backend/src/main/java/com/mycroft/ecom/EmaEcomApplication.java
package com.mycroft.ecom;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class EmaEcomApplication {
  public static void main(String[] args) {
    SpringApplication.run(EmaEcomApplication.class, args);
  }
}
```

### 4.2 Security (RBAC) Basics
```java
// backend/src/main/java/com/mycroft/ecom/security/SecurityConfig.java
package com.mycroft.ecom.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {
  @Bean
  SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    http
      .csrf(csrf -> csrf.disable())
      .authorizeHttpRequests(auth -> auth
        .requestMatchers("/api/auth/**", "/v3/api-docs/**", "/swagger-ui/**", "/actuator/health").permitAll()
        .requestMatchers("/api/admin/**").hasRole("ADMIN")
        .anyRequest().authenticated()
      )
      .httpBasic(Customizer.withDefaults());
    return http.build();
  }
}
```

```java
// backend/src/main/java/com/mycroft/ecom/rbac/Permission.java
package com.mycroft.ecom.rbac;

import jakarta.persistence.*;
import lombok.*;

@Entity @Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class Permission {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;
  @Column(unique = true, nullable = false)
  private String code; // e.g. PRODUCT_READ, PRODUCT_CREATE
  private String description;
}
```

```java
// backend/src/main/java/com/mycroft/ecom/rbac/Profil.java
package com.mycroft.ecom.rbac;

import jakarta.persistence.*;
import lombok.*;
import java.util.Set;

@Entity @Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class Profil {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;
  @Column(unique = true, nullable = false)
  private String name; // e.g. ADMINISTRATOR, INVENTORY_MANAGER
  @ManyToMany(fetch = FetchType.EAGER)
  @JoinTable(name = "profil_permissions",
      joinColumns = @JoinColumn(name = "profil_id"),
      inverseJoinColumns = @JoinColumn(name = "permission_id"))
  private Set<Permission> permissions;
}
```

```java
// backend/src/main/java/com/mycroft/ecom/user/AppUser.java
package com.mycroft.ecom.user;

import com.mycroft.ecom.rbac.Profil;
import jakarta.persistence.*;
import lombok.*;

@Entity @Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class AppUser {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;
  @Column(unique = true, nullable = false)
  private String username;
  private String password;
  private String email;
  private String employeeType; // free text defined by admin
  @ManyToOne(fetch = FetchType.EAGER)
  private Profil profil; // dynamic roles/profils
  private boolean enabled = true;
}
```

### 4.3 Product Module (Skeleton)
```java
// backend/src/main/java/com/mycroft/ecom/product/Product.java
package com.mycroft.ecom.product;

import jakarta.persistence.*;
import lombok.*;

@Entity @Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class Product {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;
  @Column(nullable = false)
  private String name;
  private String sku;
  private Double price;
  private Integer stock;
}
```

```java
// backend/src/main/java/com/mycroft/ecom/product/ProductRepository.java
package com.mycroft.ecom.product;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductRepository extends JpaRepository<Product, Long> {}
```

```java
// backend/src/main/java/com/mycroft/ecom/product/ProductController.java
package com.mycroft.ecom.product;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import lombok.RequiredArgsConstructor;

import java.util.List;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductController {
  private final ProductRepository repo;

  @GetMapping
  public List<Product> all() { return repo.findAll(); }

  @PostMapping
  public Product create(@RequestBody Product p) { return repo.save(p); }

  @GetMapping("/{id}")
  public ResponseEntity<Product> one(@PathVariable Long id) {
    return repo.findById(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
  }
}
```

### 4.4 KPI Rules Engine (Skeleton)
```java
// backend/src/main/java/com/mycroft/ecom/rules/Rule.java
package com.mycroft.ecom.rules;

import jakarta.persistence.*;
import lombok.*;

@Entity @Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class Rule {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;
  @Column(nullable = false)
  private String name; // e.g. GrossMarginRule
  @Column(length = 4000)
  private String expression; // SpEL expression, e.g. "(#revenue - #cost) / #revenue"
  private boolean active = true;
}
```

```java
// backend/src/main/java/com/mycroft/ecom/rules/RuleService.java
package com.mycroft.ecom.rules;

import lombok.RequiredArgsConstructor;
import org.springframework.expression.Expression;
import org.springframework.expression.ExpressionParser;
import org.springframework.expression.spel.standard.SpelExpressionParser;
import org.springframework.expression.spel.support.StandardEvaluationContext;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class RuleService {
  private final ExpressionParser parser = new SpelExpressionParser();

  public Object evaluate(String expression, Map<String, Object> vars) {
    // Sandbox: limit root object and allow only variables
    var ctx = new StandardEvaluationContext();
    vars.forEach(ctx::setVariable);
    Expression exp = parser.parseExpression(expression);
    return exp.getValue(ctx);
  }
}
```

```java
// backend/src/main/java/com/mycroft/ecom/rules/RuleController.java
package com.mycroft.ecom.rules;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/rules")
@RequiredArgsConstructor
public class RuleController {
  private final RuleService service;

  @PostMapping("/evaluate")
  public Object evaluate(@RequestBody Map<String, Object> payload) {
    String expr = (String) payload.get("expression");
    Map<String, Object> vars = (Map<String, Object>) payload.getOrDefault("vars", Map.of());
    return service.evaluate(expr, vars);
  }
}
```

### 4.5 Flyway Migrations (Initial)
```sql
-- backend/src/main/resources/db/migration/V1__init.sql
CREATE TABLE permission (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(120) UNIQUE NOT NULL,
  description VARCHAR(255)
);

CREATE TABLE profil (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(120) UNIQUE NOT NULL
);

CREATE TABLE profil_permissions (
  profil_id BIGINT NOT NULL REFERENCES profil(id),
  permission_id BIGINT NOT NULL REFERENCES permission(id),
  PRIMARY KEY (profil_id, permission_id)
);

CREATE TABLE app_user (
  id BIGSERIAL PRIMARY KEY,
  username VARCHAR(120) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  employee_type VARCHAR(255),
  profil_id BIGINT REFERENCES profil(id),
  enabled BOOLEAN DEFAULT TRUE
);

CREATE TABLE product (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  sku VARCHAR(120),
  price NUMERIC(12,2),
  stock INT
);

CREATE TABLE rule (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  expression TEXT,
  active BOOLEAN DEFAULT TRUE
);
```

---

## 5) `application.yml`
```yaml
# backend/src/main/resources/application.yml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/ema_ecom
    username: ema
    password: ema
  jpa:
    hibernate:
      ddl-auto: validate
    properties:
      hibernate.jdbc.time_zone: UTC
  flyway:
    enabled: true

server:
  port: 8080

logging:
  level:
    root: INFO

management:
  endpoints:
    web:
      exposure:
        include: health,info
```

---

## 6) Angular 19 Socle (Minimal but structured)

### 6.1 `package.json`
```json
{
  "name": "ema-ecom",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "start": "ng serve",
    "build": "ng build",
    "test": "ng test",
    "lint": "ng lint"
  },
  "dependencies": {
    "@angular/animations": "^19.0.0",
    "@angular/common": "^19.0.0",
    "@angular/compiler": "^19.0.0",
    "@angular/core": "^19.0.0",
    "@angular/forms": "^19.0.0",
    "@angular/platform-browser": "^19.0.0",
    "@angular/platform-browser-dynamic": "^19.0.0",
    "@angular/router": "^19.0.0",
    "rxjs": "^7.8.1",
    "tslib": "^2.6.2",
    "zone.js": "~0.14.0"
  },
  "devDependencies": {
    "@angular/cli": "^19.0.0",
    "@angular/compiler-cli": "^19.0.0",
    "typescript": "~5.6.3"
  }
}
```

### 6.2 Routing & Modules
```ts
// frontend/src/app/app.routes.ts
import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'products', pathMatch: 'full' },
  {
    path: 'products',
    loadComponent: () => import('./features/products/products.page').then(m => m.ProductsPage)
  },
  {
    path: 'employees',
    loadComponent: () => import('./features/employees/employees.page').then(m => m.EmployeesPage)
  },
  {
    path: 'profils',
    loadComponent: () => import('./features/profils/profils.page').then(m => m.ProfilsPage)
  },
  {
    path: 'kpi-rules',
    loadComponent: () => import('./features/kpi-rules/kpi-rules.page').then(m => m.KpiRulesPage)
  }
];
```

```ts
// frontend/src/main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { routes } from './app/app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { AppComponent } from './app/core/app.component';

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([]))
  ]
}).catch(err => console.error(err));
```

```ts
// frontend/src/app/core/app.component.ts
import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  template: `
    <header>
      <nav>
        <a routerLink="/products">Products</a>
        <a routerLink="/employees">Employees</a>
        <a routerLink="/profils">Profils</a>
        <a routerLink="/kpi-rules">KPI Rules</a>
      </nav>
    </header>
    <main>
      <router-outlet></router-outlet>
    </main>
  `
})
export class AppComponent {}
```

### 6.3 Feature Pages (standalone)
```ts
// frontend/src/app/features/products/products.page.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

@Component({
  standalone: true,
  selector: 'app-products',
  imports: [CommonModule],
  template: `
    <h1>Products</h1>
    <button (click)="reload()">Reload</button>
    <ul>
      <li *ngFor="let p of products">{{ p.name }} — {{ p.price | number:'1.2-2' }}</li>
    </ul>
  `
})
export class ProductsPage implements OnInit {
  products: any[] = [];
  constructor(private http: HttpClient) {}
  ngOnInit() { this.reload(); }
  reload() {
    this.http.get<any[]>('/api/products').subscribe(data => this.products = data);
  }
}
```

```ts
// frontend/src/app/features/employees/employees.page.ts
import { Component } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-employees',
  template: `<h1>Employees</h1><p>Coming soon…</p>`
})
export class EmployeesPage {}
```

```ts
// frontend/src/app/features/profils/profils.page.ts
import { Component } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-profils',
  template: `<h1>Profils</h1><p>Manage roles & permissions here.</p>`
})
export class ProfilsPage {}
```

```ts
// frontend/src/app/features/kpi-rules/kpi-rules.page.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

@Component({
  standalone: true,
  selector: 'app-kpi-rules',
  imports: [CommonModule],
  template: `
    <h1>KPI Rules</h1>
    <button (click)="test()">Test Evaluate</button>
    <pre>{{ result | json }}</pre>
  `
})
export class KpiRulesPage {
  result: any;
  constructor(private http: HttpClient) {}
  test() {
    this.http.post('/api/rules/evaluate', {
      expression: "(#revenue - #cost) / #revenue",
      vars: { revenue: 1000, cost: 400 }
    }).subscribe(res => this.result = res);
  }
}
```

---

## 7) Docker & Compose (one‑package delivery)

### 7.1 Dockerfile (single image)
```dockerfile
# syntax=docker/dockerfile:1
FROM eclipse-temurin:21-jre AS runtime
WORKDIR /app
COPY backend/target/ema-ecom-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
```

### 7.2 docker-compose.yml (App + Postgres)
```yaml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_DB: ema_ecom
      POSTGRES_USER: ema
      POSTGRES_PASSWORD: ema
    volumes:
      - dbdata:/var/lib/postgresql/data
    ports: ["5432:5432"]

  app:
    build: .
    depends_on: [db]
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://db:5432/ema_ecom
      SPRING_DATASOURCE_USERNAME: ema
      SPRING_DATASOURCE_PASSWORD: ema
    ports: ["8080:8080"]

volumes:
  dbdata:
```

---

## 8) Build & Package Script

```bash
#!/usr/bin/env bash
# ema-ecom/build-and-package.sh
set -euo pipefail
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)

pushd "$SCRIPT_DIR/frontend"
npm ci
npx ng build --configuration=production
popd

pushd "$SCRIPT_DIR/backend"
mvn -q -DskipTests clean package
popd

# Docker image (optional)
docker build -t ema-ecom:0.0.1-SNAPSHOT "$SCRIPT_DIR"

echo "\nArtifacts:"
echo "- Fat JAR: backend/target/ema-ecom-0.0.1-SNAPSHOT.jar"
echo "- Docker image: ema-ecom:0.0.1-SNAPSHOT"
```

---

## 9) README.md (Concise)

```md
# Ema E-commerce App

Dynamic web management application for e-commerce businesses.

## Core Modules
- Product Management (CRUD)
- Employee Management (custom employee types)
- Profil/Role Management (dynamic RBAC)
- KPI Rules (user-defined expressions)

## One-Package Delivery
- **Fat JAR** embeds Angular build into Spring Boot static resources.
- **Docker image** runs the same fat JAR.

## Quickstart
```bash
# 1) Build
./build-and-package.sh

# 2) Run locally (Postgres required)
export SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/ema_ecom
export SPRING_DATASOURCE_USERNAME=ema
export SPRING_DATASOURCE_PASSWORD=ema
java -jar backend/target/ema-ecom-0.0.1-SNAPSHOT.jar

# Or via Docker Compose
docker compose up --build
```

## Deploy to VPS / On-Prem
- Copy the fat JAR + `application.yml` and run `java -jar`.
- Or `docker run -p 8080:8080 ema-ecom:0.0.1-SNAPSHOT` with envs for DB.

## API Docs
- Swagger UI: `/swagger-ui/index.html`
```

---

## 10) Notes on Auth/Permissions
- Keep your existing authentication setup. Wire RBAC checks with `@PreAuthorize("hasAuthority('PRODUCT_READ')")` on endpoints as needed.
- Seed an `ADMIN` profil with full permissions in a `V2__seed_admin.sql` Flyway migration.

---

## 11) Next Steps (Optional Enhancements)
- JWT or session-based login endpoints under `/api/auth/*`.
- Angular auth interceptor to attach tokens, route guards per permission.
- Replace SpEL with **CEL** (Common Expression Language) for stricter sandboxing when needed.
- Add pagination/sorting/filtering to Product API.
```}

