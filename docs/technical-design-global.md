# EMA E-commerce — Global Technical Design

## 1. Purpose
This document captures the end-to-end technical architecture for the EMA E-commerce platform. It complements the backend and frontend design documents by describing how the subsystems interact, the supporting infrastructure, and the cross-cutting concerns that keep the platform reliable, secure, and maintainable.

## 2. System Overview
- **Product**: SaaS-style e-commerce operations console focused on configurable data components (products, orders, expenses, ads) with import pipelines and real-time updates.
- **Architecture pattern**: SPA + REST. The Angular single-page application consumes Spring Boot APIs secured by JWT. Selected features use Server-Sent Events (SSE) for push notifications.
- **Primary dependencies**: PostgreSQL for persistence, MinIO/S3 for file storage, Google Sheets APIs for import automation.

### 2.1 Deployment Topology
| Component | Runtime | Ports | Notes |
|-----------|---------|-------|-------|
| Angular SPA (built assets) | Served by Spring Boot or standalone Nginx during dev | 8080 (prod), 4200 (dev) | Uses `/api` proxy/dev server for local development |
| Spring Boot backend | JVM (Java 17+) | 8080 | Hosts REST APIs, SSE endpoints, static SPA files |
| PostgreSQL | Container/native | 5432 | Stores user, permissions, dynamic component data, metadata |
| MinIO / S3-compatible storage | Optional external service | 9000+ | Stores uploaded product images & files |
| Google Sheets API | Google Cloud | HTTPS | Accessed via service account credentials |

Docker Compose orchestrates the backend + database; the production Dockerfile packages backend + pre-built SPA into a single image.

### 2.2 Module Responsibilities (High-Level)
- **Auth & Identity**: JWT-based stateless auth, role/permission management, refresh token handling.
- **Dynamic Components (“Hybrid” domain)**: CRUD/search over table-driven components with column semantics metadata.
- **Import Pipeline**: Template analysis, CSV/Excel ingestion, Google Sheet connectors, SSE broadcasts, notification logging.
- **Notifications**: Change logs & SSE streaming for front-end updates.
- **File Handling**: MinIO integration for file/image uploads with scheduled URL refresh.

## 3. Data Flow Summary
1. **User authentication**: Angular client posts credentials to `/api/auth/login`. Spring Boot validates, issues JWT + refresh token stored in PostgreSQL. Angular persists tokens in `localStorage`.
2. **Dynamic data CRUD**: Frontend calls `/api/hybrid/{entity}` endpoints. Backend uses metadata (column_semantics) to map JSON payloads into domain-specific tables at runtime.
3. **Imports**:
   - **Template upload**: Angular uploads CSV/XLSX to `/api/import/configure`. Backend infers schema, creates tables, stores semantics, updates permissions, and populates initial data.
   - **Google Sheets**: Service account credentials stored encrypted. Scheduled/triggered syncs transform sheet rows into hybrid table upserts, emit SSE + notifications, and persist progress in `google_import_config`.
4. **File management**: Files uploaded via `/api/files/upload`. Backend stores in MinIO, returns signed URLs. Scheduled job refreshes expiring URLs and updates table columns.
5. **Real-time updates**: When hybrid data changes, backend emits `HybridUpsertEvent` to SSE stream `/api/hybrid/{entity}/upserts/stream` and records notifications. Angular clients consume events to refresh UI state.

## 4. Cross-Cutting Concerns
### 4.1 Security
- JWT access tokens with configurable issuer/secret. Refresh tokens persisted for revocation.
- Role-based access control with fine-grained `permission:*` authorities enforced via `@PreAuthorize`.
- CORS configurable via `app.cors.allowed-origins`.
- Encrypted storage of external credentials (Google service account) via AES-GCM master key.

### 4.2 Configuration Management
- Profiles `dev` and `prod` drive datasource, MinIO, scheduler, and security toggles.
- Environment variables override DB, JWT, MinIO, and Google properties.
- Frontend environment files (`src/environments`) coordinate API base URLs and Google Picker configuration.

### 4.3 Observability & Logging
- Backend uses SLF4J + Logback (default Spring Boot) with structured log messages around imports, SSE registration, and MinIO operations.
- For production, recommend log shipping (e.g., to ELK) and metrics (via Actuator) — actuator endpoints can be enabled through properties.

### 4.4 Error Handling
- Central `GlobalExceptionHandler` produces consistent `ErrorResponse { code, message }`.
- Frontend interceptors (`AuthInterceptor`) attach JWT, handle refresh, and display PrimeNG toasts for errors.
- Validation errors from imports and syncs return specific codes (e.g., `error.template.validation`) for localization.

### 4.5 Localization & Internationalization
- Backend uses Spring `MessageSource` for translated error messages.
- Frontend uses `@ngx-translate` with JSON bundles; language toggles via `LanguageService`.

### 4.6 Scheduling & Background Jobs
- Spring `@EnableScheduling` powers MinIO URL refresh (`MinioImageRefreshScheduler`) and can host future periodic jobs (e.g., Google sync polling).

## 5. Integration Points
| External System | Interface | Purpose | Configuration |
|-----------------|-----------|---------|---------------|
| Google Sheets | REST (Sheets API) | Import schema/data; credential upload & test endpoints | `google.sheets.*` properties, service account JSON encrypted in DB |
| MinIO / S3 | SDK (io.minio) | File upload, signed URL issuance | `app.minio.*` properties |
| Angular SPA | Static bundle + REST | UI runtime & API consumer | Served from backend `/` in prod; dev server proxied |

## 6. Development & Deployment Workflow
1. **Local Dev**: Run Postgres via Docker; `./run-dev.sh` launches backend (`dev` profile) + frontend (`npm start`). Angular dev server proxies `/api` to backend.
2. **Build**: Maven packages backend; Angular `npm run build` produces SPA assets. Docker multi-stage build combines them.
3. **Deployment**: `docker compose up -d` for monolithic deployment, or deploy backend and SPA separately (requires CORS adjustments).

## 7. Risk & Technical Debt Snapshot
- Dynamic SQL construction in hybrid service should be carefully validated to avoid SQL injection — currently sanitized via identifier quoting and mapping; needs ongoing review when new filters are added.
- Service account secret relies on configured AES master key; missing key prevents startup (intentional). Add operational checklist for key management/rotation.
- Import pipeline currently synchronous; large files may stress transaction boundaries. Consider streaming/batch pipeline and background tasks for very large imports.
- SSE broadcaster keeps emitters in memory; production should monitor emitter count and consider backpressure or WebSocket migration if scale demands.

## 8. Roadmap Considerations
- Expand observability (metrics, tracing) for import & sync operations.
- Improve multi-tenant or domain configurability beyond the four default components.
- Harden frontend offline/refresh handling around token refresh flows.
- Consider abstractions for additional third-party integrations (e.g., Shopify, Amazon) following established import service patterns.

---
See `technical-design-backend.md` and `technical-design-frontend.md` in this directory for subsystem-specific decisions and sequence details.
