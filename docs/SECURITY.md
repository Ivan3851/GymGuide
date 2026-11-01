# Security and local operation

## Trust boundary

GymGuide is designed for a single local Windows kiosk, not an internet-facing server. Production startup requires loopback `HOST`, a local `mongodb://` loopback URI, an explicit production session secret, and a media directory outside the release tree. Keep these constraints if repackaging. Do not expose Sails or MongoDB on a LAN or public interface without a separately reviewed security design.

Loopback is not a security boundary between Windows users on the same PC. Prefer a dedicated restricted kiosk account and a separate maintenance administrator. Keep MongoDB data/media/config ACLs limited to the required service/operator identities. MongoDB authorization is recommended in the Windows guide; loopback binding alone does not prevent other local processes from connecting.

## Admin protection

- Public catalog/map routes are intentionally unauthenticated.
- Admin routes require an active user session; mutations also require a CSRF token.
- Session cookie is signed, HTTP-only, SameSite Strict, named `gymguide.sid`; secure-cookie mode is environment controlled and should be enabled only with HTTPS.
- Production `SESSION_SECRET` must contain at least 32 bytes. Generate a unique secret per installation and store it in the protected ProgramData environment file, never Git or frontend code.
- Passwords are stored as bcrypt hashes, not plaintext. Provisioning prompts with hidden input. Passwords are limited to 72 UTF-8 bytes by bcrypt behavior and the account tool validates length.
- Login attempts are rate limited in memory (8 attempts per source IP per 15 minutes). Because it is in-memory, a Sails restart resets this window.
- Admin sessions are process-local; a service restart signs staff out. Sails' default in-memory session store emits a production suitability warning. A durable store is not configured; evaluate and test one before claiming persistence across restart.

## Media protections

The API accepts only MP4/JPEG/PNG/WebP, validates extension/MIME/signature and size, stores generated filenames, and avoids serving unattached assets publicly. Published references control public media access. Keep filesystem permissions restrictive; the media directory is not a static public directory.

## Safe data operations

- Never run demo seed against a database containing real content; inspect `MONGODB_URI` first.
- Seed is explicit and insert-only. Admin account provisioning will not replace an existing user unless an explicit reset flag is passed.
- Keep database and media backups together and protect backup media as sensitive data.
- Restore is destructive to the selected GymGuide DB/media and uses MongoDB restore with drop. Verify backup identity, database URI and operator confirmation before use.
- Do not put secrets, uploads, database files, logs or dumps into a release installer or Git.

## Known security work before customer deployment

The current release preparation notes an API dependency audit with advisories at the date recorded in [Windows deployment](DEPLOYMENT-WINDOWS.md). Re-run audit against the exact lockfiles before shipping and triage findings in a reviewed dependency update. The production in-memory session warning and rate-limit reset behavior also need explicit acceptance or remediation. No network exposure or customer deployment has been security-tested by this documentation work.
