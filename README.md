# 🎅 TurboSanta Platform

> **The High-Speed Multi-Tenant Santa Sleigh Tracking & Fundraising Platform for Round Tables across the UK & Ireland.**

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

Every Round Table uses the same hosted application — there is no need to fork, clone, or manage separate server infrastructure. A Table is identified by its **table slug** (e.g. `?table=beverley`, `?table=ellon`, `?table=doncaster`).

---

## 🚀 The 2 Deployment Models

### Model A: Turnkey Universal Site (`santasleigh.html`)
For Round Tables that want an instant, zero-maintenance, beautifully branded public portal with no custom coding:

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
For Tables (like Beverley Round Table) who run their own tailored websites (WordPress, Wix, Squarespace, or bespoke Tailwind HTML) with custom video heroes, partner styling, or unique layouts.

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

Any Round Table can migrate from their TurboSanta 1.0 Google Sheet to 2.0 in under **10 seconds** without retyping data:

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

## 💳 Multi-Gateway Donation Webhooks

TurboSanta supports real-time concurrent donation webhooks from 6 major payment gateways:

| Provider | Integration Type | Key Features |
| :--- | :--- | :--- |
| **Zeffy** | Free Platform | 100% free fee platform; parses pence/pounds and donor names. |
| **Stripe** | Payment Gateway | Listens for `checkout.session.completed` and `payment_intent.succeeded`. |
| **SumUp** | Mobile Street Card Readers | Street card taps from volunteer bucket collectors roll directly into live total! |
| **JustGiving** | Charity Platform | Real-time campaign donation notifications. |
| **PayPal** | Digital Wallet | Captures `PAYMENT.CAPTURE.COMPLETED` notifications. |
| **Custom / Zapier** | Universal Webhook | Standard JSON `{"amount": 10.00, "donorName": "Jane"}`. |

* **Concurrent Multi-Provider Support**: Tables can run Zeffy/Stripe web links on their site while simultaneously running SumUp card readers out on the streets. Both feed the live fundraising thermometer at the same time.
* **Live Test Simulator**: Admins can test incoming pings with custom amounts directly inside the portal.

---

## 🔒 Data Protection & GDPR Privacy Architecture

TurboSanta maintains strict architectural separation between public spectator data and protected volunteer / financial records:

* **Public Data (Open to all spectators)**:
  * Live Sleigh GPS coordinates, speed, and heading (`/api/live-gps`)
  * Route timetables, start times, and street listings (`/api/payload`)
  * Spatial street search and ETA calculations (`/api/lookup-street`)
  * Aggregate fundraising total raised (`£420 / £5,000`) and thermometer
  * Route sponsors, headline sponsors, and community partners
  * Volunteer sign-up form (users can submit their own details, but cannot view anyone else's)
* **Protected Data (Secured & Admin Eyes Only)**:
  * **Volunteer PII**: Names, mobile phone numbers, email addresses, assigned bucket numbers, and check-in status (requires Admin authentication; `/api/volunteers` returns `401 Unauthorized` without credentials).
  * **HMRC Gift Aid Declarations**: Statutory taxpayer names, house numbers, postcodes, and declaration dates (locked behind admin credentials on `/api/gift-aid/export`).
  * **Webhook Secret Tokens & Admin Passwords**: Stored securely in Cloudflare D1.
  * **Driver Cockpit**: GPS transmitter beacon restricted to authorized sleigh crews.

---

## 🧪 Start-to-Finish Testing Walkthrough

To verify the platform end-to-end, follow this testing path:

### Step 1: Initial Landing & Table Selection
* **URL**: `https://turbosanta-app.pages.dev/`
* **What to verify**:
  * Clean national landing page with search bar for town or postcode.
  * Table cards (Beverley, Shirley, Doncaster, Ellon, etc.).
  * Top-right buttons to sign in as organiser or view documentation.

### Step 2: Public Spectator Experience
* **URL**: `https://turbosanta-app.pages.dev/?table=beverley` (or `?table=shirley`)
* **What to verify**:
  * Clean classic Santa Sleigh layout without any admin/developer buttons visible.
  * Live interactive map with Santa radar.
  * Street search & ETA lookup.
  * Tonight's route card (showing date, start time, and route sponsor).
  * Route schedule list with past completed checkmarks.
  * Live fundraising thermometer showing current total raised and goal.
  * FAQ accordion and Volunteer sign-up link.

### Step 3: Organiser Login & Admin Portal
* **URL**: Click the subtle top-right Admin Shield on any page, or open `https://turbosanta-app.pages.dev/?admin=1&table=beverley`.
* **Credentials**:
  * Password: `Santa2026!` (or table-specific master secret).
  * Or use Google Workspace / Magic Link login.
* **What to verify**:
  * **Overview Tab**: Live radar overview, active route picker, and quick stats.
  * **Routes & Timetables**: View nightly routes, edit dates, drag-and-drop GPX files.
  * **Volunteer Operations**: View volunteer roster, check in arriving elves, assign buckets, download roster.
  * **Donation Webhooks**: View Zeffy, Stripe, SumUp, JustGiving, PayPal cards; copy webhook URL; test simulated donation.
  * **Memory Book**: View uploaded photos, filter by season (2026 vs 2027), 1-click download all photos for social media.
  * **HMRC Gift Aid**: Export official R68 CSV schedule.

### Step 4: Sleigh Driver Beacon (Route Night Simulation)
* **URL**: `https://turbosanta-app.pages.dev/beacon.html?table=beverley` (or `/cockpit`)
* **What to verify**:
  * Tap "Start Beacon" to broadcast live GPS telemetry.
  * Verify screen wake-lock prevents screen timeout while driving.
  * Watch public map update Santa's position in real time!

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

Built with ❤️ by **Beverley Round Table** for Round Tables across Great Britain and Ireland.  
Powered by TurboSanta. Do More.
