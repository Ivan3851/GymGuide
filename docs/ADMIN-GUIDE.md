# GymGuide staff guide

This guide describes the current local administration UI. The kiosk member pages are public; staff should navigate directly to `/admin` and sign in. Do not expose admin credentials to members or leave a maintenance session unattended.

## Sign in and navigation

Open `http://127.0.0.1:1337/admin` in production (or `http://127.0.0.1:5173/admin` during development). Use the account provisioned for this local gym. Sessions use a separate server-side admin timeout and are not governed by the member idle timer. A backend restart ends active sessions.

Admin pages include dashboard, managed resources, media, floor-plan editing and gym settings. The admin route guard redirects unauthenticated users to login. Admin API authorization is enforced by the backend as well as the frontend.

## Content workflow

Recommended order:

1. Create or review muscle groups and equipment types (reusable catalog concepts).
2. Create gym equipment units, selecting their equipment type and setting a recognizable display name/details and current availability.
3. Create exercises and fill summary, step instructions, benefits, tips, common mistakes, target muscles and compatible equipment types. Add variations under their parent exercise.
4. Upload approved video/images under **Media** and attach them to exercise content. Use gym-approved instructional material; demo text is fictional.
5. Add floor-plan records with the correct floor label and uploaded plan image.
6. Open **Positions** and place each physical gym equipment unit on the image. Marker coordinates are normalized, so resizing preserves the image-relative location.
7. Review the member experience on the home page, exercise details and `/map`, including both interface languages.

Archiving hides content from normal member listings while retaining records/references. Restore an archived entry instead of creating duplicate content if it should return. Referenced media cannot be deleted; remove or change content references before deleting an unused asset.

## Media guidance

Accepted uploads are MP4 video and JPEG/PNG/WebP images. Defaults cap a video at 512 MiB and an image at 15 MiB. Use locally available files; runtime playback does not rely on external URLs. Provide descriptive original filenames because they help staff identify assets, while the server stores files under generated names.

## Language

The interface supports English and Macedonian. Content may provide localized fields/translations; missing translation falls back to the available base text. Review all critical exercise instructions in both languages before displaying them to members.

## Kiosk timeout

Under **Gym settings**, configure the member inactivity timeout. It defaults to 60 seconds and accepts whole seconds from 15 to 600. Touch/navigation and other trusted user input reset it. Active video playback defers a pending home reset until playback ends; paused video does not exempt the screen. Admin navigation is excluded from this member timer.

## Equipment map workflow

The general `/map` page shows active physical equipment with valid marker positions, independent of its availability flag. Exercise detail maps show locations matching the exercise's equipment relationships. Missing images, empty floor plans or unmapped units have explanatory states; correct the plan/media/marker data in admin.

## Account and data care

The command-line account tool is intended for local provisioning/maintenance, not daily use. It refuses an existing username by default; its explicit `--reset-existing` mode changes that account password/email. There is no self-service password reset UI. Arrange a verified database-plus-media backup before major content changes. See [Database](DATABASE.md), [Security](SECURITY.md), and the Windows operator guide.
