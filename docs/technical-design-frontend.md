# EMA E-commerce — Frontend Technical Design

## 1. Overview
The frontend is a single-page application built with Angular 19. It provides admin-facing workflows for configuring dynamic data components, managing users/roles, imports, and monitoring updates in near real time.

| Attribute | Details |
|-----------|---------|
| Framework | Angular 19 (Standalone components) |
| Styling/UI | PrimeNG 19, PrimeFlex, PrimeIcons |
| State management | Angular signals & service-based caching (no NgRx) |
| Internationalization | `@ngx-translate/core` |
| Build tooling | Angular CLI, TypeScript 5.6 |
| Auth | JWT-based via `AuthService`, HTTP interceptor, per-route guards |

## 2. Application Structure
```
src/app
├── app.component.*            # Root shell wrapper (header/outlet)
├── app.routes.ts              # Route table with guards & data tokens
├── auth                       # Login component & forms
├── core                       # Cross-cutting services (auth, permissions, navigation, i18n)
├── layout                     # Shared layout components (sidenav, header)
├── shared                     # Reusable UI pieces & pipes
└── features                   # Feature areas (hybrid components, import, roles)
```

### 2.1 Core Layer
- **AuthService**: Manages login, token persistence (`localStorage`), refresh token cadence, session auto-refresh, and signals for permissions. Provides helper methods for interceptors and SSE flows.
- **AuthInterceptor**: Attaches JWT to outgoing requests, handles 401 fallback paths.
- **PermissionGuard**: Route guard verifying the current user has at least one of the configured permissions (`data.permissions`).
- **Navigation Service/Model**: Supplies side navigation tree configured based on permissions and translation keys.
- **LanguageService**: Wraps `TranslateService` to handle runtime language switching.

### 2.2 Feature Modules
- **Hybrid (Dynamic Components)**:
  - `HybridPageComponent`: orchestrates search/filter UI, modal dialogs for create/update, column configuration, and live update badges.
  - Services:
    - `HybridDataService`: wraps REST API for CRUD/search (`/api/hybrid/...`), converting responses into UI models.
    - `HybridSchemaService`: caches schema metadata & active domain context.
    - `HybridTableDataService`: merges pagination, sorting, and filter state, exposed via RxJS/Signals.
    - `HybridBadgeService`: manages badge counters per entity when SSE events arrive.
    - `HybridNotificationApiService`: pulls notification logs, marks read.
    - `HybridUpsertListenerService`: establishes SSE (`EventSource`) connection for the active domain; handles reconnect/backoff and toast notifications.
  - Models under `models/` define typed column definitions, filters, SSE payloads.
- **Import**:
  - `ImportTemplatePageComponent`: multi-tab experience for dynamic template upload and Google Sheets integration.
    - Handles domain selection, sample download, file uploads via PrimeNG `FileUpload`.
    - Calls backend endpoints for template analysis, table listing/reset, Google service account upload/testing.
    - Uses Angular `DestroyRef + takeUntilDestroyed` for subscription cleanup.
- **Roles**:
  - `RolesPageComponent` (and subcomponents) manage role CRUD, permission assignment matrix via PrimeNG tables.
- **Dashboard**:
  - `DashboardComponent`: layout shell with responsive sidenav and header.
  - `DashboardContentComponent`: dashboard placeholder with quick links/status.
  - `/dashboard` is guarded by `permissionGuard` and the `dashboard:view` permission so only authorized users hit the landing tiles.

### 2.3 Shared Modules
- `shared/` contains reusable presentation components, utility pipes, and translation keys. PrimeNG modules are imported per feature (standalone component style).

## 3. Routing & Navigation
- Routes defined in `app.routes.ts` use standalone components.
- Authenticated area is wrapped by `DashboardComponent`. The `/dashboard` landing page enforces the `dashboard:view` permission before rendering the quick links and feature tiles, while each feature route sets its own entity metadata (`entityType`, `translationPrefix`, etc.).
- `LoginComponent` is the unauthenticated entry point. On successful login, navigation service builds the menu based on available permissions.

## 4. State & Data Flow
1. **Authentication**:
   - User submits credentials to `/api/auth/login`. On success, access/refresh tokens are stored via `AuthService`.
   - `AuthInterceptor` injects tokens into requests. When a 401 occurs and refresh token exists, `AuthService` attempts refresh before forcing logout.
   - Session persistence uses timestamps to determine when to refresh proactively (`STALE_MAX_AGE_MS`).
2. **Hybrid CRUD**:
   - `HybridPageComponent` requests schema + data via `HybridDataService.search`.
   - Actions (create/update/delete) map to backend endpoints, updating local tables optimistically.
   - SSE events trigger `HybridBadgeService` counters; user interactions fetch latest data.
3. **Imports**:
   - File uploads use `FileUpload` `customUpload` hook to send to `/api/import/configure`.
   - Domain table status fetched from `/api/import/configure/tables`; reset actions call drop APIs.
   - Google Sheet integration flows: credential upload, status, sheet list, connection test, sync triggers.
4. **Notifications**:
   - `HybridNotificationApiService` fetches `/api/notifications`, surfaces via toasts/badges.

## 5. UI & Styling
- PrimeNG components styled via CSS variables/PrimeFlex utilities.
- Layout ensures mobile responsiveness (PrimeFlex grid).
- Toast messages use global key `global` for cross-feature notifications.
- SSE connection errors and parse issues surface localized toasts for user awareness.

## 6. Configuration
- Environment files:
  - `environment.ts`: dev defaults for API base, Google Picker placeholders.
  - Production builds override via `environment.prod.ts` (not shown here) generated during CI.
- Proxy configuration (`proxy.conf.json`) forwards `/api` to backend at 8080 during `npm start`.
- `angular.json` defines build targets, asset pipeline, i18n folder.

## 7. Internationalization
- Translation bundles under `assets/i18n/*.json`.
- Components use `TranslateModule` pipes/functions.
- UI text keys follow namespaced convention (`import.*`, `hybrid.*`, `common.*`).
- Language switch persists preference (service stores in `localStorage`).

## 8. Testing & Quality
- Angular CLI configured for `ng lint`. Unit/E2E tests can be added using Jasmine/Karma (default) or Playwright/Cypress for E2E.
- Critical paths to test:
  - AuthService token refresh logic (mock HTTP).
  - Hybrid services (search, SSE) with HttpTestingController.
  - Import flows with stubbed HttpClient & PrimeNG event emitters.

## 9. Build & Deployment
- Development: `npm start` (Angular dev server on 4200) with proxy to backend.
- Production: `npm run build` (outputs to `dist/ema-ecom-frontend`). Docker multi-stage copies build artifacts into backend JAR resources, enabling backend to serve SPA from `/`.
- CI/CD: ensure `npm ci && npm run build` executed before backend packaging to keep assets in sync.

## 10. Extension Points & Future Enhancements
- Integrate centralized state management (NgRx/Akita) if workflows expand.
- Add design system tokens to unify styling across features.
- Expand SSE support with reconnection jitter/backoff strategies and offline queues.
- Introduce feature modules for additional domains (e.g., Inventory analytics) using existing hybrid architecture to remain DRY.

## 11. Accessibility & UX Considerations
- PrimeNG components provide ARIA attributes; ensure custom templates maintain accessible labels.
- Toast notifications should be paired with non-visual feedback if accessibility requirements increase.
- Consider keyboard navigation auditing, especially around file upload and Google Sheets steps.

---
Refer to `technical-design-backend.md` for API details and `technical-design-global.md` for system-wide context.
