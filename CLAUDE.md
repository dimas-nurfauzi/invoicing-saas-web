# CLAUDE.md

Guidance for AI coding agents (Claude Code) working in this repository.

## Project

Frontend for the invoicing-saas backend
(<https://github.com/dimas-nurfauzi/invoicing-saas>, Spring Boot). Goal: let someone try
the app in two minutes and see the AI draft feature. Not a full product.

Screens (MVP):
1. Login + tenant sign-up (`POST /api/tenants`, `POST /api/auth/login` with tenantSlug +
   email + password)
2. Dashboard: billing summary per currency (`GET /api/summary`)
3. Invoices: list + detail; issue, record payment, void (ADMIN only)
4. AI draft: paste text → `POST /api/invoices/ai-draft` → show draft + warnings → user
   edits → save through `POST /api/invoices`
5. Customers: list (paging, search), add, edit

## Stack

- Vite, React, TypeScript (strict), npm
- API client generated from the backend's OpenAPI spec: `openapi-typescript` +
  `openapi-fetch`
- TanStack Query (server state), React Router
- Tailwind CSS + shadcn/ui, React Hook Form + Zod
- Vitest + Testing Library; Playwright for the e2e flow
- oxlint + Prettier

## Commands

```bash
npm install
npm run dev          # http://localhost:5173, proxies /api to the backend on :8080
npm run lint         # oxlint + prettier --check (npm run format fixes)
npm run typecheck
npm test             # Vitest
npm run build
npm run gen:api      # refresh openapi.json from a running backend + regenerate types
```

The backend runs separately (its README): PostgreSQL via Docker Compose, then
`./mvnw spring-boot:run` on port 8080.

## Rules

### API
- Types come only from `src/api/schema.d.ts`, generated from the committed
  `openapi.json` by `scripts/gen-api-types.mjs`. Never edit the generated file; CI fails
  if it doesn't match the snapshot.
- All calls go through `src/api/client.ts` (`api` + `unwrap`). Errors are RFC 9457
  `ProblemDetail`; show `detail` (and field `errors`) to the user.
- Lists are paged: `page` (0-based), `size` ≤ 100, response
  `{content, page, size, totalElements, totalPages}`.
- Another tenant's id is a 404 from the backend: treat 404 as "not found", nothing more.
- Never send a tenant id: the backend takes it from the token only.

### Money
- Money, quantities and percentages are **decimal strings** in requests and responses
  (`"1500000.00"`). Never `parseFloat`/`Number()` them, never compute totals in the
  browser: totals come from the backend (`InvoiceCalculator`, AI `previewTotal`).
- Format with `src/lib/money.ts` (always 2 decimals).

### Auth
- Access token (1 h, no refresh token yet) is kept in `sessionStorage` and sent as a
  bearer token. On 401, clear it and go to login. Don't log tokens or passwords.
- Role checks in the UI (e.g. hide Void for STAFF) are convenience only; the backend
  enforces them.

### AI feature
- The draft is untrusted until the user reviews it. Show the backend's `warnings`. Saving
  is an explicit user action through the normal `POST /api/invoices` with the same form
  validation as manual entry. `customerId` may be null: the user must pick a customer.
- Without `ANTHROPIC_API_KEY` the backend answers 503: show a clear message.
- Don't log the pasted text.

### Testing
- Unit/component tests with Vitest; mock the network at the fetch level, not the
  components.
- E2E (Playwright) runs against the real backend + PostgreSQL; only the AI endpoint is
  mocked (no API key in CI).
- Don't delete or skip a failing test to make CI green.

## Workflow

- One feature = one branch = one PR. Branches: `feat/<name>`, `fix/<name>`,
  `refactor/<name>`, `docs/<name>`, `ci/<name>`. Never commit directly to `main`.
- Conventional Commits.
- Fill in the PR template, including what the agent was asked to do and what the human
  corrected.
- Don't add dependencies without stating why in the PR.
- No secrets in the repo; env vars documented in `.env.example`.
