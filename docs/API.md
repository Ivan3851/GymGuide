# API reference

All application API routes begin with `/api/v1`. Success bodies generally use `{ "data": ... }`; health and some streaming routes have specialized bodies. Errors use `{ "error": { "code": "...", "message": "..." } }`. Invalid identifiers/inputs return 400, missing resources 404, conflicts 409, unauthenticated requests 401, forbidden requests 403 and database availability failures 503. See the explicit source routes in `apps/api/config/routes.js` and response helpers/controllers for exact fields.

## Public member and service endpoints

| Method | Path                                  | Purpose                                                                  |
| ------ | ------------------------------------- | ------------------------------------------------------------------------ |
| GET    | `/api/v1/health`                      | Checks API and MongoDB ping; returns 503 when DB ping fails.             |
| GET    | `/api/v1/kiosk/settings`              | Current gym member inactivity setting.                                   |
| GET    | `/api/v1/muscle-groups`               | Active muscle catalog.                                                   |
| GET    | `/api/v1/muscle-groups/:id/equipment` | Compatible types and gym inventory.                                      |
| GET    | `/api/v1/equipment/:id/exercises`     | Exercises related to an equipment type.                                  |
| GET    | `/api/v1/exercises/:id`               | Exercise details and location/media references.                          |
| GET    | `/api/v1/exercises/:id/variations`    | Variations belonging to an exercise.                                     |
| GET    | `/api/v1/floor-plans`                 | Active plans for the configured gym.                                     |
| GET    | `/api/v1/floor-plans/:id`             | Plan and active valid equipment markers.                                 |
| GET    | `/api/v1/media/:id/content`           | Streams an eligible image/video; supports byte ranges for video seeking. |

Member routes do not require an account. The selected gym is configured by `GYMGUIDE_GYM_ID` on the backend, not accepted as arbitrary tenant context from an unauthenticated client.

## Authentication endpoints

| Method | Path                   | Purpose                                         |
| ------ | ---------------------- | ----------------------------------------------- |
| GET    | `/api/v1/auth/csrf`    | Issues/returns session CSRF token.              |
| POST   | `/api/v1/auth/login`   | Username/email + password; requires CSRF token. |
| GET    | `/api/v1/auth/session` | Current admin identity or 401.                  |
| POST   | `/api/v1/auth/logout`  | Ends the session; requires auth and CSRF.       |

Admin mutations require a valid session and `X-CSRF-Token` matching the session. The browser uses an HTTP-only signed `gymguide.sid` cookie. See [Security](SECURITY.md).

## Admin endpoints

| Method     | Path                                                 | Purpose                                                           |
| ---------- | ---------------------------------------------------- | ----------------------------------------------------------------- |
| GET        | `/api/v1/admin/dashboard`                            | Active content counts.                                            |
| GET / PUT  | `/api/v1/admin/settings`                             | Read/update gym kiosk settings. PUT requires CSRF.                |
| GET / POST | `/api/v1/admin/media`                                | List/upload local media; POST requires CSRF.                      |
| DELETE     | `/api/v1/admin/media/:id`                            | Delete an unused asset; referenced assets conflict.               |
| GET        | `/api/v1/admin/:resource`                            | List supported content; `includeArchived=true` includes archived. |
| POST       | `/api/v1/admin/:resource`                            | Create supported catalog/inventory records.                       |
| PUT        | `/api/v1/admin/:resource/:id`                        | Update records and exercise relationships.                        |
| PATCH      | `/api/v1/admin/:resource/:id/archive`                | Archive without removing references.                              |
| PATCH      | `/api/v1/admin/:resource/:id/restore`                | Restore archived record.                                          |
| GET        | `/api/v1/admin/floor-plans/:id/markers`              | List editable markers.                                            |
| PUT        | `/api/v1/admin/floor-plans/:id/markers/:equipmentId` | Create or move a normalized marker; CSRF required.                |
| DELETE     | `/api/v1/admin/floor-plans/:id/markers/:equipmentId` | Remove marker; CSRF required.                                     |

Supported `:resource` values are `muscle-groups`, `equipment-types`, `gym-equipment`, `exercises`, `variations`, and `floor-plans`. Unmatched `/api/v1/*` paths return JSON 404. Automatic Sails REST/action/shortcut blueprints are disabled.

## Examples

```powershell
Invoke-RestMethod http://127.0.0.1:1337/api/v1/health
Invoke-RestMethod http://127.0.0.1:1337/api/v1/muscle-groups
Invoke-RestMethod http://127.0.0.1:1337/api/v1/floor-plans
```

Use actual returned IDs for subsequent requests. Do not hardcode demo content in a client. The route list is a concise map; inspect controller/service serializers before relying on a particular nested response field.
