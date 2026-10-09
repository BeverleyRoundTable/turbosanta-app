# 🎅 TurboSanta Platform

> **The High-Speed Multi-Tenant Santa Sleigh Tracking & Fundraising Platform for Round Table Chapters across the UK & Ireland.**

TurboSanta lets families follow Santa's sleigh live in real time, lookup street arrival windows, donate via Zeffy/Stripe, claim HMRC Gift Aid, share photos in a digital memory book, and talk to Santa via AI voice calls. 

Behind the scenes, it powers sleigh crews with GPS driver beacons, logs volunteer sign-ups directly into a SQL database, and gives organisers a **God Mode** mission control dashboard.

---

## 🌐 Live System URLs

| Environment / Service | Production URL |
| :--- | :--- |
| **Cloudflare Pages Frontend** | `https://turbosanta-app.pages.dev` |
| **Cloudflare Worker D1 API** | `https://turbosanta-api.beverley247.workers.dev` |
| **GitHub Repository** | `https://github.com/BeverleyRoundTable/turbosanta-app` |
| **Platform Master Guide** | `https://turbosanta-app.pages.dev/guide.html` |
| **Modular Embed Studio** | `https://turbosanta-app.pages.dev/embed.html` |
| **Visual Route Planner** | `https://turbosanta-app.pages.dev/route_planner.html` |

---

## 🏗️ Architecture & Multi-Tenancy

TurboSanta is built as a **single shared frontend, multi-tenant Cloudflare D1 edge database** platform:

```
                                  ┌──────────────────────────────┐
                                  │   Cloudflare Pages Edge      │
                                  │  turbosanta-app.pages.dev    │
                                  └──────────────┬───────────────┘
                                                 │
                   ┌─────────────────────────────┴─────────────────────────────┐
                   ▼                                                           ▼
       [Model A: Turnkey Sleigh Site]                                [Model B: Modular Embeds]
        /santasleigh.html?table=:slug                                 /embed.html?table=:slug
        - 100% Out-of-the-box Portal                                   - For Custom Websites (WordPress,
        - Clean public design                                           Squarespace, Wix, custom HTML)
        - Branded via ?table=:slug                                    - Individual <iframe> components
                   │                                                           │
                   └─────────────────────────────┬─────────────────────────────┘
                                                 │
                                                 ▼
                                  ┌──────────────────────────────┐
                                  │   Cloudflare Worker API      │
                                  │  turbosanta-api.beverley247  │
                                  └──────────────┬───────────────┘
                                                 │
                                                 ▼
                                  ┌──────────────────────────────┐
                                  │   Cloudflare D1 SQL DB       │
                                  │  (Routes, Streets, Telemetry,│
                                  │   Volunteers, Donations)     │
                                  └──────────────────────────────┘
```

Every Round Table chapter uses the same hosted application — there is no need to fork, clone, or manage separate server infrastructure. A chapter is identified by its **table slug** (e.g. `?table=beverley`, `?table=ellon`, `?table=doncaster`).

---

## 🚀 The 2 Deployment Models

### Model A: Turnkey Universal Site (`santasleigh.html`)
For Round Table chapters who want an instant, zero-maintenance, beautifully branded public portal with no custom coding:

* **URL Format**: `https://turbosanta-app.pages.dev/santasleigh.html?table=[slug]`
* **Visual Presentation**: 100% clean, public-facing, and faithful to the tried-and-tested classic Santa Sleigh layout. No developer or admin buttons are exposed to the public.
* **Features Included**:
  * 🛷 **Live GPS Santa Sleigh Map** with Lapland resting state and live road snapping
  * 🌟 **Tonight's Route Spotlight** featuring tonight's corporate sponsor, start/end times, and street list
  * 🔍 **Spatial Street & Address Lookup** for immediate arrival window search
  * 📅 **Full Route Schedule Grid** with past route completion checkmarks
  * 🎁 **Fundraising Target Thermometer** synced live to total donations
  * 👥 **Volunteer Elf Recruiting Banner** linking to the SQL-backed Crew Hub
  * 📸 **Digital Memory Book** photo gallery
  * ❓ **FAQ & Safety Accordion** covering route safety, cul-de-sacs, and donation handling

---

### Model B: Modular `<iframe>` Embeds for Custom Websites
For chapters (like Beverley Round Table) who run their own tailored websites (WordPress, Wix, Squarespace, or bespoke Tailwind HTML) with custom video heroes, partner styling, or unique layouts.

Admins can open the **Embed Studio** (`/embed.html?table=[slug]`) and copy 1-click embed codes:

| Module | Embed Target | Key Features |
| :--- | :--- | :--- |
| **Live GPS Sleigh Tracker** | `/tracker.html?table=[slug]` | Real-time GPS movement, road snapping, audio, wake-lock |
| **Spatial Address Lookup** | `/address.html?table=[slug]` | Instant house/street search with route catchment radius |
| **Crew Hub & Volunteers** | `/crew.html?table=[slug]` | Volunteer registration into D1 SQL, bucket assignment, route checklist |
| **Talk to Santa AI Call** | `/santa_chat.html?table=[slug]` | Interactive ElevenLabs AI conversational voice phone call widget |
| **Workshop Blueprint** | `/blueprint.html?table=[slug]` | Interactive sleigh schematics (batteries, lighting, sound system) |
| **Digital Memory Book** | `/memory_book.html?table=[slug]` | Community photo upload and photo wall |
| **HMRC Gift Aid Form** | `/gift_aid.html?table=[slug]` | Single or recurring Gift Aid declaration form |
| **Christmas Countdown** | `/countdown.html?table=[slug]` | Dynamic route arrival countdown banner |
| **Tonight's Route Card** | `/route_card.html?table=[slug]` | Social share card with sponsor and street highlights |

---

## ⚡ Fast Transfer from TurboSanta 1.0 (Google Sheets & Excel)

Any Round Table chapter can migrate from their TurboSanta 1.0 Google Sheet to 2.0 in under **10 seconds** without retyping data:

1. **Export from Google Sheets**: Open your 1.0 Google Sheet and click **File → Download → Microsoft Excel (.xlsx)**.
2. **Open the Importer**:
   * Via Admin Portal: Login and click the **1.0 Excel / Sheets Importer** tab.
   * Or via Standalone Tool: Visit `/migrate.html?table=[slug]`.
3. **Instant Auto-Population**:
   * Drag and drop the `.xlsx` file.
   * Client-side SheetJS instantly extracts:
     * 🛷 **Settings & Branding**: Sleigh display name, charity name, fundraising target (£), Zeffy/Stripe donate link, primary/accent colors, and canned PA preset announcements.
     * 🗺️ **Routes & Timetables**: Nightly route names, dates (auto-converting Excel serial dates), start/end times, GPX tracks, and sponsor logos.
     * 📍 **Streets**: Comma-separated street lists are automatically parsed, trimmed, and sequenced into individual records for the **Spatial Address Lookup tool**.
     * 👥 **Volunteers Roster**: Name, preferred route, role, phone, and check-in status mapped into the `volunteers` SQL table.
     * 🤝 **Sponsors**: Route sponsors, pledged amounts, and logo URLs.
   * Click **Auto-Populate TurboSanta 2.0 Database** to write directly to Cloudflare D1 SQL via `POST /api/migrate`.
   * Also offers 1-click **Download D1 SQL Script (.sql)** and **Export JSON**.

---

## 🗺️ Route Management & Direct GPX Upload

TurboSanta preserves **dense road geometry** and **planned stops** through standard GPX 1.1 files.

### Direct GPX Upload in the Portal
1. Open the Admin Portal -> **Routes & Timetables** -> **Add New Route** (or Edit).
2. Enter the **Route Name** (e.g., *East Route*, *Molescroft*).
3. Drag & drop your `.gpx` file directly into the **GPX Route File** zone:
   * **Dense Trackpoints (`<trkpt>`)**: Points spaced every 5–10 meters are parsed and stored. The live tracker uses this dense track for **snap-to-road calculation**, ensuring the sleigh smoothly glides along actual roads instead of drifting over gardens or houses.
   * **Planned Stops (`<wpt>`)**: Waypoints (e.g., `<wpt lat="..." lon="..."><name>Reindeer Rest - King's Head</name></wpt>`) are automatically extracted and rendered on the live map as Santa stop / grotto markers.
   * **Total Distance & Duration**: Calculated automatically in miles.

### Built-in Visual Route Planner (`/route_planner.html`)
Admins can also design or inspect routes visually:
* Click anywhere on real roads to snap routes using OpenStreetMap.
* Add named stops / grottos with 1 click.
* Click **Detect Streets** to auto-extract every road name along the route using OpenStreetMap Nominatim reverse geocoding.
* Export dense GPX files (5m, 10m, or 25m interval options).

---

## 👥 Volunteer Management & Crew Operations (`/crew.html`)

All volunteer registrations are stored in Cloudflare D1 SQL.

### 1. Supporter Sign-Up
Volunteers visit `/crew.html?table=[slug]` to register their name, mobile phone number, preferred route night, and role (Bucket Collector, Safety Walker, Sleigh Driver).

### 2. Route Night Crew Leader Console
On route night, crew leaders enter their admin secret to:
* **Check in volunteers** as they arrive at the staging area.
* **Assign bucket numbers** (e.g. *Bucket #3 assigned to Dave*).
* **Complete pre-departure safety checklists** (Vehicle hitch inspection, high-vis vests, coin seals).
* **Close route** and log cash collected at the end of the evening.

---

## 📡 Driver Beacon & Telemetry Ingest

Sleigh drivers can use their smartphone as a high-accuracy GPS broadcast beacon:
* Open `/tracker.html?mode=driver` or `/cockpit`.
* Screen wake-lock prevents the phone from sleeping while on the sleigh.
* Coordinates, road name, and vehicle speed are transmitted to `PUT /api/telemetry` every 2 seconds.
* Offline resilience: If mobile data drops, GPS coordinates are cached locally via IndexedDB and synchronized once connection resumes.

---

## 🛰️ God Mode Mission Control (`/god_mode.html`)

Organisers monitor the entire operation from `/god_mode.html?table=[slug]`:
* **Live PA Broadcast**: Push urgent announcements to the public tracker banner (e.g. *"Santa is pausing at the Market Cross for photos!"*).
* **Crew Alerts**: Send private operational alerts directly to volunteer phones via Crew Hub.
* **Live Telemetry & Speed**: Real-time vehicle speed, GPS health, and viewer counters.
* **HMRC Gift Aid Export**: Download HMRC-compliant R68 CSV schedules ready for direct upload to Charities Online.

---

## 🗄️ Cloudflare D1 SQL Schema

The database schema (`tables`, `routes`, `route_streets`, `volunteers`, `telemetry`, `donations`, `gift_aid`) is managed in `worker/`:

```sql
-- Volunteers Table
CREATE TABLE IF NOT EXISTS volunteers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_id TEXT NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
    route_id TEXT REFERENCES routes(id),
    route_name TEXT,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    organisation TEXT,
    checked_in BOOLEAN DEFAULT 0,
    bucket_number TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_volunteers_table_route ON volunteers(table_id, route_name);
```

---

## 💻 Local Development & Deployment

### Setup
```bash
# Clone the repository
git clone https://github.com/BeverleyRoundTable/turbosanta-app.git
cd turbosanta-app/frontend

# Install dependencies
npm install

# Run local development server
npm run dev

# Build production bundle
npm run build
```

### Continuous Deployment
Every push to the `main` branch automatically triggers Cloudflare Pages build and deployment:
```bash
git add -A
git commit -m "feat: your changes"
git push origin main
```
Cloudflare Pages builds the app and publishes it live to `https://turbosanta-app.pages.dev` in ~60 seconds.

---

## 📄 License & Attribution

Built with ❤️ by **Beverley Round Table** for Round Table chapters across Great Britain and Ireland.  
Powered by TurboSanta. Do More.
