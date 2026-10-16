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

## 4. Repository & Deployment Hygiene
- **Worker Code**: Keep `worker/` in `.gitignore` to prevent leaking private Cloudflare secrets or backend code to GitHub.
- **Verification**: Always run `npm run build` after editing frontend code to ensure zero compilation or bundling regressions.
