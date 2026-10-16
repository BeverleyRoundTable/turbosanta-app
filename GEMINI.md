# TurboSanta 2.0 — Engineering & Project Rules

## 1. Confidentiality of National Leadership Tracking
- **Zero Exposure to Normal Tables**: Standard table organizers and public users must **NEVER** have any knowledge, UI warnings, hints, notifications, or text copy regarding National Leadership tracking or the National Fleet Radar (`/national.html`).
- **No National Mentions in Local Settings**: Do not mention "national leaderboard", "national admin", "fleet tracking", or "national leadership" in settings pages, input tooltips, helper text, or branding banners visible to local tables.
- **Strict Role Segregation**:
  - The `/national.html` page, National Board whitelist, and cross-fleet rollup stats are strictly gated to authenticated National Board members (`role: "national_admin"` / `isMasterAdmin`).
  - National Board members have read-only visibility into aggregated stats across all tables.

## 2. National Admin Isolation from Local Tables
- **Read-Only Viewer Status**: National Board logins (`national@roundtable.org.uk`, `admin@roundtable.org.uk`, `rtbi@roundtable.org.uk`, `president@...`, etc.) are purely for viewing `/national.html`.
- **No Table Auto-Provisioning**: The backend must never auto-provision, register, or insert a table row in D1 for reserved national scopes (`national`, `admin`, `rtbi`, `leaderboard`, `fleet`).
- **No Sleigh or Slug Needed**: National Board accounts must never require or be assigned a local table slug or sleigh profile (`tableId: null`, `tableSlug: null`).

## 3. Brand Standard Sleigh Display Names
- **Strict Naming Formula**: Every Table's official name and sleigh display name is strictly locked to:
  `[Town] Round Table Santa Sleigh` (e.g. `Beverley Round Table Santa Sleigh`, `Shirley Round Table Santa Sleigh`).
- **Admin Portal Lock**: In the Table Settings & Branding view, the Sleigh Display Name field is read-only and automatically derived from the table slug.
- **National Leaderboard Display**: On the National Leaderboard (`public/national.html`), the table name is rendered cleanly using `shortenName(d)` so only the town name is shown (e.g., `Beverley`, `Shirley`, `Cheltenham`, `Melton Mowbray`).

## 4. Custom Domain Subdomain & Element URL Architecture (`[town].roundtablesantasleigh.co.uk`)
- **Mandatory Subdomain Format**: The entire multi-tenant system is built around `https://[town].roundtablesantasleigh.co.uk` (e.g., `https://beverley.roundtablesantasleigh.co.uk`, `https://ringwood.roundtablesantasleigh.co.uk`, `https://shirley.roundtablesantasleigh.co.uk`).
- **Never Display Root `?table=` Links in Guides/Embeds**: In all guides (`guide.html`), launchpads (`hub.html`), embed directories (`embed.html` / `embed_generator.js`), and Admin Portal link generators (`AdminPortal.jsx`), always format and display Table links using the town subdomain (`https://[town].roundtablesantasleigh.co.uk/...`) rather than `https://roundtablesantasleigh.co.uk/...?table=[town]`.
- **Canonical Element URLs**:
  - Public Turnkey Site: `https://[town].roundtablesantasleigh.co.uk`
  - Pre-Checkout +25% Gift Aid Donate Flow: `https://[town].roundtablesantasleigh.co.uk/?donate=1`
  - Table Admin Portal: `https://[town].roundtablesantasleigh.co.uk/?admin=1`
  - Live GPS Sleigh Tracker: `https://[town].roundtablesantasleigh.co.uk/tracker`
  - Spatial Address & Doorstep Pin Lookup: `https://[town].roundtablesantasleigh.co.uk/address`
  - Volunteer Crew Hub: `https://[town].roundtablesantasleigh.co.uk/crew`
  - HMRC Gift Aid +25% Declaration Portal: `https://[town].roundtablesantasleigh.co.uk/giftaid` (or `/gift_aid.html`)
  - Visual Route Planner: `https://[town].roundtablesantasleigh.co.uk/route_planner.html`
  - Print Studio (1-Up Poster, 4-Up Bucket Stickers, 6-Up Lanyards): `https://[town].roundtablesantasleigh.co.uk/qr_poster.html`
  - Battery-Saver Driver Beacon & Cash Logger: `https://[town].roundtablesantasleigh.co.uk/beacon.html`
  - Driver 3D Sat-Nav: `https://[town].roundtablesantasleigh.co.uk/tracker?driver=1`
  - God Mode Command Center: `https://[town].roundtablesantasleigh.co.uk/god_mode.html`
  - Digital Memory Book: `https://[town].roundtablesantasleigh.co.uk/memory_book.html`
  - 1.0 Excel & Google Sheet Importer: `https://[town].roundtablesantasleigh.co.uk/migrate.html`
  - Direct Links & Embed Studio: `https://[town].roundtablesantasleigh.co.uk/embed.html`
  - Command Hub Launchpad: `https://[town].roundtablesantasleigh.co.uk/hub.html`
  - Platform Master Guide: `https://[town].roundtablesantasleigh.co.uk/guide.html`
  - Season Wrap & AGM Report: `https://[town].roundtablesantasleigh.co.uk/season_wrap.html`
  - Corporate Sponsor Impact Report: `https://[town].roundtablesantasleigh.co.uk/partner_report.html`
  - Volunteer Appreciation Certificates: `https://[town].roundtablesantasleigh.co.uk/volunteer_cert.html`
- **Subdomain Detection in All Static Pages**: Every standalone HTML tool in `public/` must automatically extract `[town]` from `window.location.hostname` when accessed via `https://[town].roundtablesantasleigh.co.uk/...` (as well as supporting `?table=[town]` as an override).

## 5. Repository & Deployment Hygiene
- **Worker Code**: Keep `worker/` in `.gitignore` to prevent leaking private Cloudflare secrets or backend code to GitHub.
- **Verification**: Always run `npm run build` after editing frontend code to ensure zero compilation or bundling regressions.
