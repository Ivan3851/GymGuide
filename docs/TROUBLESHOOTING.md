# Troubleshooting

Start with the health endpoint. A `200` confirms Sails is serving and its health controller successfully pinged MongoDB; a port accepting TCP alone does not prove database authentication or query readiness.

```powershell
Invoke-RestMethod http://127.0.0.1:1337/api/v1/health
```

## Development

| Symptom                                 | Checks                                                                                                                                                                                                                                                                                                                                                                         |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| API will not start / connection refused | Confirm MongoDB service is running and `MONGODB_URI` uses the intended local database. Check API terminal output.                                                                                                                                                                                                                                                              |
| `gymguide_dev` is missing               | Start MongoDB, verify `.env`, then explicitly run `npm run seed:demo` only if this is the intended demo database.                                                                                                                                                                                                                                                              |
| Frontend has network/API errors         | Start Sails on 1337, then Vite on 5173. Check `/api/v1/health` directly and through `http://127.0.0.1:5173/api/v1/health`. Vite proxy is fixed to loopback port 1337.                                                                                                                                                                                                          |
| Tablet cannot open dev frontend         | Confirm the tablet and PC are on the same non-isolated LAN, use the PC's current IPv4 address from `ipconfig` with port 5173, and allow Node/Vite only on a trusted Private network if Windows prompts. Vite binds `0.0.0.0:5173`; the API still binds to PC loopback and Vite proxies `/api` to `127.0.0.1:1337`. Do not expose the API or MongoDB. This is development-only. |
| Admin login fails                       | Check the intended database and gym ID, username/email spelling and active account. Provision/reset only through the documented CLI flow; do not create a default password.                                                                                                                                                                                                    |
| Frontend route refresh returns 404      | Confirm Sails is serving built assets in production and the route's SPA fallback is explicitly configured. In development use Vite's URL.                                                                                                                                                                                                                                      |

## Media and maps

| Symptom                                     | Checks                                                                                                                                                                                                                          |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Upload rejected                             | Check supported MP4/JPEG/PNG/WebP type, actual file signature, and configured byte limits. Defaults: video 512 MiB, image 15 MiB.                                                                                               |
| Asset record exists but file is unavailable | Check `GYMGUIDE_MEDIA_DIR`, `files/` content and service ACL. Database metadata and media files must be restored from a matched backup.                                                                                         |
| Video cannot seek                           | Use supported MP4 and the local `/api/v1/media/:id/content` endpoint; API streaming implements byte ranges. Check browser console and API logs.                                                                                 |
| Floor plan absent                           | Confirm plan is active, points to a ready image asset, image file exists, and configured gym ID matches.                                                                                                                        |
| Equipment marker missing                    | Confirm the physical unit and floor plan are active, marker belongs to that unit/plan/gym and `x`/`y` are finite values within 0–1. General map intentionally includes unavailable-but-active units and excludes archived ones. |

## Installed Windows kiosk

See [Windows operator procedures](../deployment/windows/README.md). Inspect service status and logs before changing configuration. Typical checks:

```powershell
Get-Service MongoDB,GymGuide
Invoke-RestMethod http://127.0.0.1:1337/api/v1/health
```

The MongoDB service name can differ; use the configured service name if `MongoDB` is not registered. Check the protected ProgramData env file, MongoDB URI and service identity permissions. If the API remains unavailable after MongoDB returns, the documented recovery is to confirm DB health and restart GymGuide service.

## Startup, restart and recovery

The production runner displays a local waiting page and retries MongoDB readiness; after Sails exits, it retries after five seconds. The service wrapper also has restart delays. This is code behavior, not proof of recovery from real power loss. Verify Windows services are configured for automatic start, check Event Viewer/service logs, and rehearse on the target PC. See deployment testing limits.

## Before restoring data

Stop and preserve logs, confirm exact backup set and intended local database, and understand that restore replaces current DB and media. Do not try seed/reset as a repair for customer content. Keep failed/prior restore material for operator review; see [Database](DATABASE.md).
