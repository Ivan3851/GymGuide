# GymGuide documentation

## Guides

- [Architecture](ARCHITECTURE.md): runtime boundaries, request flow and design decisions.
- [Development](DEVELOPMENT.md): local prerequisites, configuration, run/test/build commands.
- [Installation](INSTALLATION.md): preparing a new Windows kiosk installation.
- [Windows deployment](DEPLOYMENT-WINDOWS.md): services, kiosk account, startup and recovery model.
- [Database](DATABASE.md): collections, relationships, indexes, seed safety and persistence.
- [API](API.md): routes, authentication, request conventions and errors.
- [Admin guide](ADMIN-GUIDE.md): staff workflows for content, media, maps and settings.
- [Troubleshooting](TROUBLESHOOTING.md): practical checks for local operation.
- [Security](SECURITY.md): trust boundaries and safe operations.
- [Releasing](RELEASING.md): offline payload, install, update and rollback process.
- [Windows scripts and operator procedures](../deployment/windows/README.md).

## Status language

“Implemented” means the behavior is represented in the current repository. “Prepared” means scripts/configuration exist but have not been run in a real kiosk deployment. “Verify on target” means acceptance testing is still required on the exact Windows, Node, MongoDB and packaging versions intended for delivery. Read the Windows deployment guide's verification notes before operating a gym kiosk.

This documentation describes one local gym installation. Shared catalog IDs and gym-specific records are a foundation for multi-gym data, but cross-gym administration and synchronization are not implemented.
