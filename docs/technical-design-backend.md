# EMA E-commerce — Backend Technical Design

## 1. Overview
The backend is a Spring Boot (Java 17) application that exposes REST APIs, SSE streams, and scheduled jobs. It orchestrates authentication, dynamic domain data, imports, external integrations, and file storage.

| Attribute | Details |
|-----------|---------|
| Framework | Spring Boot 3.x, Spring Data JPA, Spring Security |
| Build | Maven (multi-module with root `pom.xml`, backend module) |
| Runtime | JVM, packaged as executable JAR or Docker image |
| Database | PostgreSQL (DDL managed dynamically, Flyway removed) |
| File storage | MinIO / S3-compatible object storage |
| Integrations | Google Sheets API via service account |

The application is modularized using Spring Modulith (`@Modulithic(sharedModules = "common")`), with feature-aligned packages under `com.mycroft.ema.ecom`.

## 2. Package Structure & Responsibilities
```
com.mycroft.ema.ecom
├── Application.java           # Bootstraps Spring context, scheduling, modulith support
├── auth                       # Identity, JWT, permissions, role management
├── common                     # Shared utilities (config, files, metadata, security)
├── config                     # Legacy configuration placeholders
├── domains                    # Business feature areas (hybrid, imports, notifications)
└── integration.google         # Google Sheets credential management & API access
```

### 2.1 `auth`
- **Domain Entities**: `User`, `Role`, `Permission`, `RefreshToken` extend `BaseEntity`.
- **Repositories**: Spring Data JPA repositories for CRUD and lookups.
- **Services**:
  - `AuthServiceImpl`: login, refresh, logout with refresh token persistence.
  - `UserServiceImpl`, `RoleServiceImpl`, `PermissionServiceImpl`: administrative CRUD with validation.
  - `JwtService`: issues/validates JWT access tokens; ensures refresh token presence before refresh.
  - `AccessControlService`: flattens user roles into permission strings for runtime checks.
  - `DevAdminInitializer`: dev-profile bootstrap that ensures minimal schema & admin user.
- **Web Layer**: REST controllers for `/api/auth`, `/api/users`, `/api/roles`, `/api/permissions`.
- **Security Configuration**:
  - `SecurityConfig`: registers `JwtAuthenticationFilter`, secures endpoints, sets stateless sessions.
  - `CorsConfig`: exposes `CorsConfigurationSource` driven by `app.cors.allowed-origins`.
  - `MethodSecurityConfig`: enables `@PreAuthorize`.

### 2.2 `common`
- **config**: `MessageSourceConfig` and `OpenApiConfig` define i18n & Swagger/OpenAPI metadata.
- **error**: Domain exceptions and `GlobalExceptionHandler` returning `ErrorResponse`.
- **files**: MinIO integration
  - `MinioProperties`: typed config (`app.minio.*`).
  - `MinioConfig`: conditionally creates `MinioClient`.
  - `MinioFileStorageService`: uploads bytes/Multipart ext, generates signed URLs, refreshes.
  - `MinioImagePayload`: value object for MINIO:IMAGE column payloads.
  - `MinioImageRefreshScheduler`: scheduled job to refresh expiring URLs in DB columns.
  - `FileUploadController`: API `/api/files/upload` with semantic validation.
- **metadata**: Column semantics persistence service for dynamic components.
- **bootstrap**: `DefaultComponentBootstrapper` seeds component definitions and sample data on startup.
- **persistence**: `BaseEntity` with UUID id + timestamps.
- **security**: `AesGcmSecretEncryptor` encryption helper.
- **web**: `PageResponse` adapter for paginated responses.

### 2.3 `domains`
- **hybrid**: Dynamic entity CRUD using metadata-driven tables.
  - `HybridEntityServiceImpl`: builds SQL dynamically for search, CRUD, filtering, MINIO payload normalization.
  - `HybridEntityController`: REST endpoints under `/api/hybrid/{entityType}`.
  - DTOs in `dto` package describe requests/responses (`HybridCreateDto`, `HybridResponseDto`, etc.).
- **imports**: Template ingestion and Google Sheet pipelines.
  - DTOs for sheet configs, responses, webhook.
  - `ExcelTemplateService`: analyzes CSV/XLSX, infers column types, builds DDL, populates tables.
  - `DomainImportService`: orchestrates configure-from-file flow (DDL execution, semantics persistence, permission assignment).
  - `GoogleSheetImportService`: integrates Google Sheets data with existing template pipeline.
  - `GoogleSheetSyncService`: handles row-level sync webhooks, including payload coercion, MINIO special cases, notifications, SSE broadcast.
  - `ImportConfigureController`, `ImportTemplateController`, `GoogleImportController`, `GoogleSheetSyncController`, `HybridUpsertStreamController`: REST endpoints.
  - Eventing: `HybridUpsertEvent`, `HybridUpsertBroadcaster` (SSE) and `ImportStreamPublisher` (placeholder log-based publisher).
- **notifications**:
  - Entity `NotificationLog`, repository, service, and API to expose change logs.
- **imports.util**: `MemoryMultipartFile` to reuse file pipeline with in-memory data.

### 2.4 `integration.google`
- Domain entity `GoogleServiceAccountSecret` stores encrypted JSON.
- Repository `GoogleServiceAccountSecretRepository`.
- `GoogleServiceAccountCredentialService`: encrypts credentials, provides status, deletion.
- `GoogleSheetsClient`: caches Sheets service based on credential fingerprint, wraps API calls.
- `GoogleIntegrationConfig` binds `GoogleSheetsProperties`.
- `GoogleSheetsServiceAccountController`: upload/test endpoints with security constraints.

## 3. Persistence & Data Model
- **Relational DB**: PostgreSQL. Base tables include `users`, `roles`, `permissions`, `refresh_tokens`, `notification_logs`, `google_service_account_secret`, `google_import_config`, plus dynamic component tables (e.g., `product_config`) created at runtime.
- **Column semantics**:
  - `column_semantics` table tracks metadata per domain/table/column (semantic type, JSON metadata, timestamps) accessed via `ColumnSemanticsService`.
- **Dynamic tables**:
  - Created by `DomainImportService` using inferred schema; include an `id UUID PRIMARY KEY` plus dynamic columns.
- **Permissions linking**:
  - Many-to-many join tables `roles_permissions`, `users_roles`.

## 4. API Surface (Selected Endpoints)
- `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`
- `GET/POST/PUT/DELETE /api/users`, `/api/roles`, `/api/permissions`
- `GET /api/hybrid/{entityType}` with search & filters
- `POST /api/hybrid/{entityType}` / `PUT` / `DELETE` / `GET` for CRUD
- `POST /api/import/configure` — template upload
- `GET /api/import/configure/tables` / `DELETE /api/import/configure/table`
- `POST /api/import/google/connect` — Google Sheet ingestion
- `POST /api/import/google/sync` — row-level webhook (secured via secret/jwt)
- `GET /api/hybrid/{entityType}/upserts/stream` — SSE stream
- `POST /api/files/upload` — MinIO-backed file upload
- `GET /api/notifications` — change log retrieval, plus mark-read actions

(Swagger/OpenAPI generated via `springdoc-openapi`; accessible under `/swagger-ui.html`.)

## 5. Security Model
- **Authentication**: Stateless JWT with HMAC256. Access token claims include `roles` and `permissions`.
- **Authorization**: `@PreAuthorize` annotations referencing permission strings (e.g., `hasAuthority('product:create')`).
- **Refresh tokens**: Issued per login, stored in DB; enforced single active session per user using `existsByUserAndRevokedFalse...`.
- **Input validation**: Manual validations with `IllegalArgumentException`/`BadRequestException`. Import flows sanitize file types, header names, duplicate detection, etc.
- **Secrets**:
  - `app.security.master-key` (Base64) required for AES-GCM encryption of Google credentials.
  - MinIO credentials (`app.minio.access-key`, `app.minio.secret-key`).

## 6. Background Jobs & Scheduling
- `MinioImageRefreshScheduler` runs at `app.minio.refresh-interval` (default 12h). It:
  1. Fetches `column_semantics` tagged with `MINIO:IMAGE`.
  2. Scans associated tables for expiring payloads.
  3. Calls `MinioFileStorageService.refreshUrl`, updates JSON column values.
- Additional scheduled tasks can be added by enabling new beans; `@EnableScheduling` is set at application entry point.

## 7. Error Handling & Logging
- `GlobalExceptionHandler` maps expected exceptions to HTTP statuses and i18n messages.
- Logging strategy:
  - `DefaultComponentBootstrapper`: info/warn for seeding results.
  - Import & sync services: warn logs for failure cases, debug for data details.
  - SSE broadcaster logs registration/removal events.
  - Use `LoggerFactory.getLogger()` across services; default log level is INFO (configurable).

## 8. Configuration & Environments
- `application.yml` (dev) vs `application-prod.yml`:
  - Datasource URLs, credentials, JPA settings.
  - JWT secrets, issuer.
  - MinIO properties.
  - Google Sheets integration toggle.
- Environment variables override:
  - `DB_URL`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET`, `JWT_ISSUER`, `CORS_ALLOWED_ORIGINS`.
- Docker Compose `.env` defines DB and JWT values.

## 9. Testing Strategy
- `src/test/java/com/mycroft/ema/ecom/ApplicationTests` placeholder (to expand).
- Recommended coverage:
  - Unit tests for import parsing, column semantics, permission enforcement.
  - Integration tests using Testcontainers for Postgres, verifying dynamic table creation and SSE notifications.
  - Contract tests for Google Sheets client (mocked HTTP).

## 10. Extension Points & Future Work
- **API additions**: new domains can be configured by extending `DomainImportService.tableForDomain` and adjusting metadata seeding.
- **Multi-tenant support**: would require schema separation or tenant column, plus adjustments to permission seeds.
- **Observability**: integrate Spring Boot Actuator, structured logging (JSON), and metrics exporters.
- **Resilience**: add retry/backoff for Google API + MinIO operations.

## 11. Operational Guidelines
- Ensure `app.security.master-key` and MinIO credentials are set before starting prod instance; otherwise application will fail fast at startup (desired behavior).
- Regularly rotate JWT secret, master key, and service account credentials; update environment variables and restart application.
- Monitor scheduler logs for MinIO refresh failures. Consider alerting when repeated failures occur.

---
Refer to `technical-design-frontend.md` for SPA architecture and to `technical-design-global.md` for cross-cutting system concerns.
