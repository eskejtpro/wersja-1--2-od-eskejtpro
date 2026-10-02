# API route inventory — GymTracker Pro 3.0.8

Read-only inventory checked against Express route declarations in `server.ts` and first-party requests in `src/`. “AI auth” means `requireAiSession`: loopback-only local servers bypass Bearer auth; network-bound servers require a session. Cloud Run does not get the loopback bypass. “Local file” is process-local server storage, not durable Cloud Run storage.

| Method | Endpoint | Auth | Input → output | Persistence / external calls | Status in code |
|---|---|---|---|---|---|
| GET | `/api/health` | Public | none → process/app/API versions, capabilities, timestamp | none | Implemented; status is not uptime/durability proof |
| GET | `/api/version` | Public | none → app/API/schema versions, capabilities | none | Implemented |
| POST | `/api/auth/login` | Public | `{username,password}` → short-lived Bearer token | Session and rate-limit counters in memory | Local only; Cloud Run returns 503 |
| POST | `/api/auth/logout` | Bearer session | Authorization header → 204 | Removes current in-memory session | Implemented |
| GET | `/api/server/google-info` | Public | none → process/OAuth metadata | none | Implemented; never proves Cloud durability or uptime |
| POST | `/api/auth/google/login` | Public + Google ID token | `{idToken}` → internal Bearer session and verified `sub` profile | Verifies Google token; session in memory | Local only; Cloud Run returns 503 without durable session store |
| GET | `/api/auth/google/user` | Bearer session | none → authenticated flag and session profile | Reads in-memory session | Implemented |
| POST | `/api/auth/google/logout` | Bearer session | none → 204 | Removes current in-memory session | Implemented |
| GET | `/api/data` | Bearer session | none → `{schemaVersion,revision,updatedAt,contentHash,data}` | Reads per-principal JSON file | Local persistent file; Cloud Run returns 503 (`cloud_store_not_configured`) |
| POST | `/api/data` | Bearer session | `{schemaVersion,revision,contentHash,data}` → stored envelope or validation/conflict error | Validates data and revision/hash; temp-file + rename | Local persistent file; Cloud Run unavailable; no cloud DB |
| GET | `/api/sync/status` | Bearer session | none → revision/hash/status/device fields | Reads per-principal store | Server status only; Cloud Run store unavailable; not a complete multi-device sync engine |
| GET | `/api/update/check` | Public | query `currentVersion`, `channel` → release metadata or unconfigured status | Reads optional local release manifest | Implemented for manifest metadata; client does not install packages |
| GET | `/api/update/history` | Public | none → releases from manifest | Reads optional local release manifest | Server endpoint implemented; first-party update history is local storage, no client call found |
| GET | `/api/update/download/:version` | Public | version path → 503 | none | Disabled, explicit 503 |
| POST | `/api/update/apply` | Public | none → 503 | none | Disabled, explicit 503 |
| POST | `/api/update/rollback` | Public | none → 503 | none | Disabled, explicit 503 |
| POST | `/api/ai/coach/chat` | AI auth | message/persona/context/history → reply/model/fallback | Gemini when configured; otherwise labelled local heuristic; no server-side chat persistence | Implemented; routine client context is minimized; provider exception is 503 |
| POST | `/api/ai/chat` | AI auth | Same as coach chat | Same as coach chat | Backward-compatible alias; used by Quick Access |
| POST | `/api/ai/coach/generate-plan` | AI auth | goal, days/split/experience/focus → plan text/model | Gemini or labelled local example; not persisted | Implemented; server test coverage is partial |
| POST | `/api/ai/coach/audit-health` | AI auth | max 50 validated test rows + bodyWeight → educational audit | Gemini only; sanitized JSON fields, 12 kB aggregate cap; no-key and empty-response fail closed | Implemented; validation and no-key 503 tested |
| POST | `/api/ai/coach/nutrition-plan` | AI auth | body metrics/goal/activity → text and macros | Gemini or local formula; not persisted | Implemented; input-bound validation needs separate audit |
| POST | `/api/ai/coach/swap-exercise` | AI auth | exercise/category/reason → substitutions or explanation | Gemini or labelled local template; not persisted | Implemented; input-bound validation needs separate audit |
| POST | `/api/ai/coach/tts` | AI auth | text/voice → base64 audio/MIME/model | Gemini TTS; no-key 503 | Implemented; UI caller exists |
| POST | `/api/ai/agent/parse-command` | AI auth | `{command,gymData?}` → action list/summary; current implementation accepts but does not use `gymData` | Gemini or empty local result; no action is persisted by the route | Implemented; no first-party caller found |
| POST | `/api/ai/coach/analyze` | AI auth | GymData → calculated summary and/or analysis | Gemini or local calculation/heuristic; not persisted | Implemented; no first-party caller found |
| POST | `/api/agent/analyze` | Bearer session (including loopback) | limited analysis payload → local facts/provider metadata | Local heuristic only; no outbound request or persistence | Implemented but no direct first-party request found |
| GET | `*` (production SPA fallback) | Public | non-API page request → `index.html` | none | Production UI routing, not an API endpoint |

## First-party request mapping

- `src/utils/serverApi.ts` → `/api/health`, `/api/version`, `/api/data` GET/POST, Google info/login/user/logout. It has no client function for `/api/sync/status`.
- `src/utils/appUpdateService.ts` → `/api/update/check`. Download/apply/rollback deliberately return client-side failure and do not call their disabled server routes. Update history lives in local storage; it does not call `/api/update/history`.
- `src/components/AiCoachView.tsx` → coach chat, TTS, plan, nutrition, exercise swap, health audit. `/api/ai/coach/analyze` is not called here.
- `src/components/QuickAccessDashboard.tsx` → `/api/ai/chat` alias.
- `src/utils/aiAgentEngine.ts` → three arbitrary user-configured `aiAgentServerUrl` requests. These are not bound to a server route contract; the app's settings panel only provides an example URL.
- No direct first-party request found for `/api/auth/login`, `/api/auth/logout`, `/api/sync/status`, `/api/update/history`, the disabled update actions, `/api/agent/analyze`, `/api/ai/coach/analyze`, or `/api/ai/agent/parse-command`. Some are shown in the server settings endpoint list, which is not proof they are invoked.

## Audit notes

- This inventory is source inspection, not a claim that each route was exercised end-to-end. Test files provide route-level evidence for Google OIDC, server auth/data, health-audit fail-closed, update unavailability, and local-agent behavior; the AI route set does not yet have complete success/validation/unauthorized/rate-limit coverage.
- `/api/ai/coach/nutrition-plan` and `/api/ai/coach/swap-exercise` interpolate request values into prompts and need dedicated schema/range/length validation before being considered robust against malformed or oversized semantic input.
- `/api/ai/agent/parse-command` returns unvalidated model-produced action objects; it must not be treated as an executable action contract until whitelist/schema/permission/preview/confirmation checks are verified in the consuming code.
- Local server JSON files are not a durable Cloud Run backend. Cloud Run deliberately rejects login/data features rather than claiming persistence.
