# invoicing-saas-web

React + TypeScript frontend for
[invoicing-saas](https://github.com/dimas-nurfauzi/invoicing-saas), a multi-tenant invoicing
API (Spring Boot) with an AI feature that turns a pasted billing request into a draft
invoice. Goal: try the app in two minutes and see the AI draft flow; not a full product.

**Status:** all MVP screens work: sign-in and workspace sign-up, dashboard, customers,
invoices (drafts, issuing, payments, voiding) and the AI draft.

**Stack:** Vite · React 19 · TypeScript · TanStack Query · React Router · Tailwind CSS +
shadcn/ui · React Hook Form + Zod · Vitest + Testing Library · oxlint + Prettier ·
API client generated from the backend's OpenAPI spec (`openapi-typescript` +
`openapi-fetch`).

## Run locally

Prerequisites: Node 22+ and the backend running on `http://localhost:8080` (see the
[backend README](https://github.com/dimas-nurfauzi/invoicing-saas#quick-start)).

```bash
npm install
npm run dev          # http://localhost:5173
```

The dev server proxies `/api` to the backend (`BACKEND_URL`, default
`http://localhost:8080`), so the browser only talks to one origin. The proxy drops the
`Origin` header, which also makes it work behind a tunnel (ngrok etc.) without touching the
backend's CORS settings. To call the backend directly instead, set `VITE_API_BASE_URL` in
`.env.local` (see `.env.example`); the backend then needs `CORS_ALLOWED_ORIGINS` to include
`http://localhost:5173`.

## Try it

Open <http://localhost:5173>, choose **Create workspace**, enter a business name, an email and
a password (8+ characters). That creates a tenant with you as its admin and signs you in. To
sign in later you need the workspace (the slug shown under the business name), the email and
the password.

## AI draft

**AI draft** (`/ai-draft`): paste a billing request in any words ("Tagih CV Alpha 3 bulan
maintenance @ 1,25 jt, diskon 10%, PPN 11%"). The backend asks Claude for a structured draft,
validates it and answers with the draft, warnings (e.g. no matching customer, assumed due
date) and a preview total it calculated itself. The frontend shows all of that in the normal
invoice form; nothing is saved until you click **Save draft**, which goes through the same
`POST /api/invoices` and validation as a manual invoice.

The backend needs `ANTHROPIC_API_KEY` for this. Without it the endpoint answers 503 and the
screen says so, with a link to manual entry. The pasted text is sent to the backend only
and isn't stored or logged by the frontend.

## Auth

- Login (`POST /api/auth/login`) returns a 1-hour access token. The app keeps it, its expiry
  and the workspace slug in `sessionStorage` and sends it as `Authorization: Bearer …`. The
  role (ADMIN / STAFF) comes from `GET /api/me`.
- When the token expires, or any request gets a 401 for the current token, the app clears the
  session and shows the login page with "Your session has expired". There is no refresh token
  yet, so that means signing in again after an hour.
- **The trade-off, honestly:** `sessionStorage` is readable by any JavaScript running on the
  page, so an XSS bug would let an attacker read the token and use it until it expires (at
  most 1 hour). An `HttpOnly` cookie would hide it from scripts, but needs cookie auth plus
  CSRF protection on the backend, which is stateless bearer-token auth today. For a demo this
  is an acceptable trade-off; the mitigations are React's escaping (no
  `dangerouslySetInnerHTML`), no third-party scripts at runtime, a short token lifetime, and
  `sessionStorage` instead of `localStorage` (gone when the tab closes, not shared between
  tabs). A production version would move to an `HttpOnly`, `SameSite` cookie set by the
  backend, plus a Content Security Policy.
- Hiding admin-only actions in the UI is convenience only; the backend enforces roles and
  tenant isolation.

## Scripts

| Script              | What it does                                                                                           |
| ------------------- | ------------------------------------------------------------------------------------------------------ |
| `npm run dev`       | Dev server with hot reload                                                                             |
| `npm run build`     | Typecheck + production build into `dist/`                                                              |
| `npm test`          | Unit tests (Vitest, jsdom)                                                                             |
| `npm run lint`      | oxlint + Prettier check (`npm run format` fixes formatting)                                            |
| `npm run typecheck` | TypeScript only                                                                                        |
| `npm run gen:api`   | Fetch `/v3/api-docs` from a running backend into `openapi.json`, then regenerate `src/api/schema.d.ts` |

## API types

`openapi.json` is a committed snapshot of the backend spec, and `src/api/schema.d.ts` is
generated from it, so CI builds without a backend. After a backend API change, run the
backend and `npm run gen:api`; CI fails if `schema.d.ts` doesn't match the snapshot.

springdoc documents `BigDecimal` as `number`, but the API sends and accepts money,
quantities and percentages as decimal strings. `scripts/gen-api-types.mjs` maps every
`number` without a format to `string`, so the frontend never does float math on money;
amounts are formatted straight from the string (`src/lib/money.ts`, always 2 decimals).
Response fields are optional in the generated types because the spec doesn't mark them
required (and some are nullable).

## Layout

```
src/
├── api/          client.ts (typed client, bearer token, 401 hook, ApiError), schema.d.ts (generated)
├── ai/           AI draft request hook, draft → form mapping, example text
├── auth/         session storage, AuthProvider, RequireAuth, form schemas, useMe
├── customers/    API hooks, form schema, add/edit and archive dialogs
├── invoices/     API hooks, schemas, InvoiceForm (shared with the AI draft), payment/void dialogs
├── components/   layout/, FormField, NativeSelect, Pagination, ConfirmDialog, ui/ (shadcn/ui)
├── lib/          money and date formatting, error messages, query client
├── pages/        one file per screen
├── test/         fetch mock and app render helpers for Vitest
└── router.tsx
```

## Built with an AI agent

Like the backend, built with Claude Code following [`CLAUDE.md`](CLAUDE.md): a plan I
approve per PR, one branch per PR, and the [PR template](.github/pull_request_template.md)
records what I directed and what I corrected.
