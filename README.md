# grokhr-web

GrokHR people directory for the multi-repo demo. List employees, add them, edit them, and deactivate them. Fictional example data only — no real PII, no authentication.

The API must be running before the directory can load.

```bash
npm install
npm run dev
```

Open http://localhost:5173. The app calls FastAPI at `VITE_API_URL` (default `http://localhost:8000`). Copy `.env.example` to `.env` to point elsewhere:

```
VITE_API_URL=http://localhost:8000
```

Restart `npm run dev` after changing it. The API has to allow the Vite origin (`http://localhost:5173`) on `GET`, `POST`, `PATCH`, and `OPTIONS`, including `Content-Type`.

## API contract

JSON uses camelCase. Reads also accept `first_name`, `last_name`, and `hire_date` so a snake_case FastAPI response still renders. Writes send camelCase only.

| Method | Path | Body | Response |
| --- | --- | --- | --- |
| `GET` | `/employees` | optional `?status=active` or `?status=inactive` | `Employee[]` (or `{ employees \| items \| data \| results: Employee[] }`) |
| `GET` | `/employees/{id}` | | `Employee` |
| `POST` | `/employees` | `EmployeeCreate` | `Employee` |
| `PATCH` | `/employees/{id}` | `EmployeeUpdate` | `Employee` |
| `PATCH` | `/employees/{id}` | `{ "status": "inactive" }` or `"active"` | `Employee` |

`Employee` fields: `id`, `firstName`, `lastName`, `email`, `department`, `title`, `hireDate` (`YYYY-MM-DD`), `status` (`active` or `inactive`).

Deactivate is `PATCH` with `{ "status": "inactive" }`. The record stays in the directory. Reactivate sends `{ "status": "active" }`.

Errors follow FastAPI: `{ "detail": "..." }` or `{ "detail": [{ "loc": ["body", "email"], "msg": "..." }] }`.

Search and department filters run in the browser on the loaded list. The status control reloads that list: Active and Inactive send `?status=`, and All calls `GET /employees` with no status filter.

## Shared types

`src/types/employee.ts` vendors the types that belong in `@grokhr/shared` (sibling repo `grokhr-shared`). When that package is checked out beside this one and exports the same types, switch the dependency:

```json
"@grokhr/shared": "file:../grokhr-shared"
```

Then import from `@grokhr/shared` instead of `src/types/employee.ts`.

## Scripts

- `npm run dev` — Vite dev server
- `npm test` — API client, form validation, and directory UI tests
- `npm run lint` — oxlint
- `npm run build` — typecheck and production build
