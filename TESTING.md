# EcoAware — Comprehensive Testing Guide

This document is the authoritative reference for the EcoAware testing infrastructure, covering both the `apps/api` (backend) and `apps/web` (frontend) workspaces.

---

## Quick Start

```bash
# Run all backend tests
cd apps/api && npm test

# Run all frontend tests
cd apps/web && npm test

# Generate coverage reports
cd apps/api && npm run test:coverage
cd apps/web && npm run test:coverage
```

---

## Test Counts

| Workspace | Test Files | Tests | Status |
|---|---|---|---|
| `apps/api` | 12 | 113 | ✅ All pass |
| `apps/web` | 9 | 81 | ✅ All pass |
| **Total** | **21** | **194** | ✅ |

---

## Technology Stack

| App | Framework | Rationale |
|---|---|---|
| `apps/api` | **Vitest** | ESM-native (`"type": "module"`), no Babel transform needed, fast startup |
| `apps/web` | **Vitest** | Integrates directly with existing Vite config, zero additional config |
| API Integration | **Supertest** | Tests Express routes in-process — no port binding, no external server |
| DOM | **jsdom** | Lightweight headless browser for React component tests |
| React | **@testing-library/react** | Tests component behavior, not implementation details |
| Mocking | **vi.mock / vi.stubGlobal** | Module-level mocking for DB, API, and global APIs |
| Coverage | **@vitest/coverage-v8** | V8-native coverage — fast and accurate |

---

## Backend (`apps/api`)

### Configuration

- **File**: [`apps/api/vitest.config.ts`](apps/api/vitest.config.ts)
- **Test directory**: `src/__tests__/`
- **Environment**: Node
- **Coverage provider**: V8

### Test Files

#### `emissionFactors.test.ts` — 12 tests

Tests `calculateCO2()` and the `EMISSION_FACTORS` dictionary.

| Test | Description |
|---|---|
| `car_petrol × 100` | Correct CO2 calculation (21 kg) |
| `electricity × 10` | Energy calculation (5 kg) |
| `beef_meal × 1` | Diet calculation (3.3 kg) |
| `vegan_meal × 5` | Diet calculation (0.8 kg) |
| `landfill_waste × 10` | Waste calculation (5.7 kg) |
| Floating-point bus | `bus × 3 = 0.267` (not 0.267000003) |
| Floating-point train | `train × 7 = 0.287` |
| Unknown factor key | Throws descriptive error |
| Category coverage | All 4 categories present |
| co2PerUnit > 0 | All factors positive |
| Valid category enum | All factors have valid category |
| Non-empty label/unit | All factors have text fields |

#### `jwt.test.ts` — 15 tests

Tests `signAccessToken`, `verifyAccessToken`, `signRefreshToken`, `verifyRefreshToken`.

| Test | Description |
|---|---|
| Access token format | 3-segment JWT string |
| Access token userId | Decodes correctly |
| Access token email | Decodes correctly |
| Tampered token | Throws on signature corruption |
| Invalid string | Throws on junk input |
| Empty string | Throws |
| Refresh token format | 3-segment JWT string |
| Refresh userId round-trip | Correct |
| Refresh email round-trip | Correct |
| Cross-secret rejection | Access token rejected as refresh |
| Refresh tampered | Throws |
| Algorithm header | HS256 specified in header |
| Refresh algorithm | HS256 specified |
| Issuer claim | `ecoaware-api` in payload |
| Expiry claim | `exp` is in the future |

#### `auth.middleware.test.ts` — 2 tests

Tests the `authenticate` Express middleware.

#### `errorHandler.test.ts` — 5 tests

Tests the global error handling middleware: HTTP 500 response, dev/prod message exposure, logging.

#### `sanitize.test.ts` — 17 tests

Tests the input sanitization utilities: HTML tag removal, null byte stripping, object sanitization, SQL injection detection.

#### `routes.health.test.ts` — 5 tests

Tests `GET /api/health`: HTTP 200, status field, timestamp, ISO format, Content-Type.

#### `routes.auth.test.ts` — 10 tests

Integration tests for `/api/auth` routes using supertest + mocked DB.

| Route | Test |
|---|---|
| POST /register | Empty body → 400 |
| POST /register | Invalid email → 400 |
| POST /register | Short name → 400 |
| POST /register | Short password → 400 |
| POST /login | Empty body → 400 |
| POST /login | Malformed email → 400 |
| POST /refresh | No token → 400 |
| POST /refresh | Invalid token → 401 |
| POST /logout | Always → 200 |
| GET /me | Returns user → 200 |

#### `routes.activities.test.ts` — 12 tests

Integration tests for `/api/activities`.

| Route | Test |
|---|---|
| GET / | Returns activities array |
| POST / | factorKey+quantity → 201 |
| POST / | direct co2Kg → 201 |
| POST / | Empty body → 400 |
| POST / | Invalid category → 400 |
| POST / | Wrong date format → 400 |
| POST / | Missing factorKey and co2Kg → 400 |
| POST / | Empty description → 400 |
| DELETE /:id | Not found → 404 |
| GET /emission-factors | Returns factors → 200 |
| GET /emission-factors | car_petrol present |
| GET /emission-factors | Factor has required fields |

#### `routes.goals.test.ts` — 8 tests

Integration tests for `/api/goals`.

| Route | Test |
|---|---|
| GET / | Returns goals array |
| POST / | Valid body → 201 |
| POST / | Empty title → 400 |
| POST / | Negative targetCo2Kg → 400 |
| POST / | Zero targetCo2Kg → 400 |
| POST / | Wrong deadline format → 400 |
| POST / | Empty body → 400 |
| DELETE /:id | Not found → 404 |

#### `routes.offsets.test.ts` — 8 tests

Integration tests for `/api/offsets`.

#### `routes.stats.test.ts` — 12 tests

Integration tests for `/api/stats`: footprint, breakdown, monthly (6 entries), recent-activities, tips (≤4 items, correct shape).

---

## Frontend (`apps/web`)

### Configuration

- **File**: [`apps/web/vite.config.ts`](apps/web/vite.config.ts) (`test` block)
- **Test directory**: `src/__tests__/`
- **Environment**: jsdom
- **Setup file**: `src/test/setup.ts` (registers jest-dom matchers)

### Test Files

#### `AuthContext.test.tsx` — 8 tests

Tests the `useAuth` hook and `AuthProvider` component.

| Test | Description |
|---|---|
| Throws outside provider | Error guard works |
| Guest user initialized | Default state |
| isAuthenticated = true | When user exists |
| isLoading = false | Initial state |
| login updates user | API mock called |
| register updates user | API mock called |
| logout sets null | Clears user state |
| updateUser works | State update |

#### `api.tokens.test.ts` — 7 tests

Tests token management functions with stubbed localStorage.

#### `formValidation.test.ts` — 24 tests

Tests email, password, name, date, and quantity validation rules.

#### `utils.test.ts` — 25 tests

Tests pure utility functions: CO2 estimation, initials generation, date helpers, category labels, footprint calculations.

---

## Running Tests

### All Tests (single command per workspace)

```bash
cd apps/api && npm test
cd apps/web && npm test
```

### Watch Mode (for development)

```bash
cd apps/api && npm run test:watch
cd apps/web && npm run test:watch
```

### Coverage Reports

```bash
# Backend coverage (outputs to apps/api/coverage/)
cd apps/api && npm run test:coverage

# Frontend coverage (outputs to apps/web/coverage/)  
cd apps/web && npm run test:coverage
```

Coverage reports are generated in HTML format at `./coverage/index.html` and can be opened directly in a browser.

### Coverage Thresholds

| Workspace | Statements | Branches | Functions | Lines |
|---|---|---|---|---|
| `apps/api` | 60% | 55% | 60% | 60% |
| `apps/web` | 50% | 45% | 50% | 50% |

---

## Security Testing

The test suite includes specific security-focused tests:

### JWT Security
- Algorithm pinned to HS256 (prevents algorithm confusion attacks)
- Issuer and audience claims validated
- Cross-secret token rejection (access token cannot be used as refresh)
- Tampered signature detection

### Input Sanitization
- HTML tag stripping (XSS prevention)
- Null byte removal
- Object-level sanitization
- SQL injection pattern detection

### Rate Limiting
- Auth routes: 10 requests per 15 minutes per IP
- API routes: 100 requests per minute per IP
- Auto-bypassed in test environment (`NODE_ENV=test`)

---

## Mock Strategy

### Database Mocking (Backend)
All route tests mock `src/db/connection.js` using `vi.mock()` before importing the router. This means:
- No SQLite file is touched during tests
- Tests are deterministic and fast (< 3s total)
- Each test file controls its own mock data

### API Mocking (Frontend)
The `AuthContext.test.tsx` mocks `../services/api.js` using `vi.mock()`. The `api.tokens.test.ts` uses `vi.stubGlobal('localStorage', ...)` with an in-memory Map.

### No Real Network Calls
No test makes an actual HTTP request to an external server. All network calls are intercepted by either supertest (in-process Express) or vi.mock().

---

## CI Integration

Add these commands to your CI pipeline:

```yaml
# Example GitHub Actions step
- name: Test Backend
  run: cd apps/api && npm test

- name: Test Frontend
  run: cd apps/web && npm test
```

For coverage enforcement, use `npm run test:coverage` which will exit with code 1 if thresholds are not met.

---

## Files Added/Modified

### New Test Files
- `apps/api/src/__tests__/emissionFactors.test.ts`
- `apps/api/src/__tests__/jwt.test.ts`
- `apps/api/src/__tests__/auth.middleware.test.ts`
- `apps/api/src/__tests__/errorHandler.test.ts`
- `apps/api/src/__tests__/sanitize.test.ts`
- `apps/api/src/__tests__/routes.health.test.ts`
- `apps/api/src/__tests__/routes.auth.test.ts`
- `apps/api/src/__tests__/routes.activities.test.ts`
- `apps/api/src/__tests__/routes.goals.test.ts`
- `apps/api/src/__tests__/routes.offsets.test.ts`
- `apps/api/src/__tests__/routes.stats.test.ts`
- `apps/api/src/__tests__/crypto.test.ts` — PII encryption/decryption tests
- `apps/web/src/__tests__/AuthContext.test.tsx`
- `apps/web/src/__tests__/api.tokens.test.ts`
- `apps/web/src/__tests__/formValidation.test.ts`
- `apps/web/src/__tests__/utils.test.ts`
- `apps/web/src/__tests__/App.test.tsx`
- `apps/web/src/__tests__/AuthPage.test.tsx` — Updated with keyboard autograph signature test
- `apps/web/src/__tests__/useCarbonData.test.ts`
- `apps/web/src/__tests__/SettingsPage.test.tsx`
- `apps/web/src/__tests__/Pages.test.tsx`

### New Source Files (Security & Quality)
- `apps/api/src/middleware/rateLimit.ts` — Rate limiting
- `apps/api/src/services/sanitize.ts` — Input sanitization
- `apps/api/src/services/jwt.ts` — HS256 algorithm hardening + issuer/audience
- `apps/api/src/services/crypto.ts` — PII fields encryption/decryption
- `apps/api/src/services/tips.ts` — Shared sustainability recommendation cards
- `apps/api/src/services/gemini.ts` — Gemini Flash content generation
- `apps/api/src/services/goals.service.ts` — Isolated goals database transaction handler
- `apps/api/src/controllers/goals.controller.ts` — Goals request verification handler
- `apps/api/.env.example` — Environment variable documentation

### Modified Source Files
- `apps/api/src/index.ts` — Applied rate limiters
- `apps/api/src/db/connection.ts` — Made remote/serverless LibSQL cloud database compatible
- `apps/api/src/routes/auth.ts` — Integrated transparent PII details encryption
- `apps/api/src/routes/assistant.ts` — Integrated Local RAG semantic matching and Gemini Flash LLM logic
- `apps/api/src/routes/stats.ts` — Re-routed to use shared tips library
- `apps/api/src/routes/goals.ts` — Decoupled database commands to service controller methods
- `apps/api/vitest.config.ts` — Coverage config added
- `apps/web/vite.config.ts` — Coverage config added
- `apps/web/src/hooks/useCarbonData.ts` — Fixed `any[]` → `Goal[]`
- `apps/web/src/pages/DashboardPage.tsx` — Appended hidden screen-reader accessible tables next to charts
- `apps/web/src/pages/InsightsPage.tsx` — Cleaned page formatting
