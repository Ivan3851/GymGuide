# Database and persistence

## Connection and persistence rules

Development uses `MONGODB_URI`, defaulting to `mongodb://127.0.0.1:27017/gymguide_dev`. Production requires an explicit `mongodb://` URI to a loopback host, a database name other than `gymguide_dev`, and a persistent media path outside the app release directory. MongoDB's own `dbPath` is configured separately by the operator; see [Windows deployment](DEPLOYMENT-WINDOWS.md).

Startup uses Sails migration mode `safe`, ensures named indexes, and cleans interrupted media uploads. It does not seed, clear or overwrite existing catalog records. Do not point a development seed or test at customer data.

IDs are stable strings in `_id` fields. Timestamps are numeric epoch milliseconds where defined. References are stored as IDs and validated by application services; MongoDB does not enforce relational foreign keys.

## Collections and relationships

| Collection           | Purpose and key fields                                                                                                                             | Scope/links                                                                               |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `gyms`               | `slug`, `name`, `status`, `settings.memberInactivityTimeoutSeconds`                                                                                | One installation selects a gym. Settings default to 60 seconds; accepted range is 15–600. |
| `muscleGroups`       | `slug`, `name`, `description`, `translations`, `sortOrder`, active/demo flags                                                                      | Reusable catalog.                                                                         |
| `equipmentTypes`     | `slug`, `name`, `description`, `translations`, `sortOrder`, active/demo flags                                                                      | Reusable catalog category/type.                                                           |
| `exercises`          | `slug`, `name`, `summary`, instruction/benefit/tip/mistake arrays, `translations`, `videoMediaId`, `imageMediaIds`, `sortOrder`, active/demo flags | Reusable exercise catalog; media IDs reference `mediaAssets`.                             |
| `exerciseVariations` | name/description/instructions/translations/order, `exerciseId`                                                                                     | Reusable variation belonging to an exercise.                                              |
| `exerciseMuscles`    | `exerciseId`, `muscleGroupId`, `role`                                                                                                              | Many-to-many exercise target muscles; role is primary/secondary.                          |
| `exerciseEquipment`  | `exerciseId`, `equipmentTypeId`                                                                                                                    | Many-to-many exercise/equipment compatibility.                                            |
| `gymEquipment`       | `gymId`, `equipmentTypeId`, `displayName`, details, `isAvailable`, active/demo flags                                                               | Physical gym-owned equipment unit; type links to shared catalog.                          |
| `gymFloorPlans`      | `gymId`, `name`, `floorLabel`, `imageMediaId`, order, active                                                                                       | Gym-specific floor plan referencing an image asset.                                       |
| `floorPlanMarkers`   | `gymId`, `floorPlanId`, `gymEquipmentId`, `x`, `y`                                                                                                 | One marker per unit per plan; normalized coordinates from 0 through 1.                    |
| `mediaAssets`        | original name, generated `storageName`, MIME/type, size, SHA-256, status, uploader and timestamps                                                  | Metadata only; file bytes are on disk.                                                    |
| `adminUsers`         | username/email, bcrypt `passwordHash`, role, `gymId`, active state and timestamps                                                                  | Gym-scoped admin identity. Password hash is never returned by API.                        |

The complete field validation is in `apps/api/api/models`. `DatabaseIndexes.js` defines unique slug and association indexes plus ordering/inventory lookup indexes. Indexes are ensured during bootstrap and seed.

## Shared catalog / gym-specific information

Catalog collections are reusable. Physical inventory, plans, markers, settings and staff assignments carry a `gymId` or reference gym-owned records. Current `GYMGUIDE_GYM_ID` selects the one local gym; this is not yet a tenant-aware hosted service. Cross-gym authorization and synchronization need a separate design before multi-gym hosting.

## Demo seed safety

Demo records are maintained in `apps/api/api/data/demo-catalog.js` and seeded by `apps/api/scripts/seed-demo.js`. The seed uses deterministic IDs and `$setOnInsert` semantics; it validates references and aborts when catalog/inventory contains non-demo records. It must be invoked manually and never runs at service startup. It does not remove data.

The sample set currently contains nine muscle groups, eight equipment types, twelve exercises, four variations, relationship records, one gym and eight physical units. To isolate a demo, edit `apps/api/.env` so `MONGODB_URI` names a new local database (for example, `gymguide_demo_poc`) and run `npm run seed:demo`. Review the URI before command execution. Do not reset or drop a database to reseed. Since the operation is insert-only, edited existing demo documents are not refreshed; replace/reset demo content only in a newly named disposable database.

## Media and matched backups

In development the default is `<repo-root>/data/media`; production requires `GYMGUIDE_MEDIA_DIR` to be an absolute persistent directory outside the release. The service stores generated UUID filenames in `files/` and transient uploads in `.incoming/`. MongoDB stores the matching metadata and references. Losing either side can produce missing media or dangling metadata.

Back up MongoDB and the entire media directory together using the operator script. A restore uses `mongorestore --drop` and replaces the current media directory, so it is intentionally destructive and requires a verified matched set plus confirmation. See [Windows deployment](DEPLOYMENT-WINDOWS.md) and [Releasing](RELEASING.md).

## Persistence verification limits

Persistence is enforced by explicit paths and absence of startup seed/reset logic in code. A real restart/power-loss acceptance test on the target Windows installation is still required; documentation and static inspection do not prove disk durability, service ACL correctness or recovery on a deployed machine.
