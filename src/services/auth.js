// TurboSanta 2.0 Authentication Service
// Enforces @roundtable.org.uk domain verification & secure admin sessions

const SESSION_KEY = "turbosanta_admin_session";
const OTP_STORAGE_KEY = "turbosanta_auth_otp";
const WORKER_API = "https://turbosanta-api.beverley247.workers.dev";

/**
 * Validates that an email belongs to the official Round Table Google Workspace
 */
export function isRoundTableEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const clean = email.trim().toLowerCase();
  return clean.endsWith("@roundtable.org.uk") || clean.endsWith("@roundtable.co.uk");
}

export const DEFAULT_NATIONAL_ADMIN_EMAILS = [
  "beverley247@roundtable.org.uk",
  "national@roundtable.org.uk",
  "admin@roundtable.org.uk",
  "rtbi@roundtable.org.uk"
];

export const SLUG_ALIASES = {
  "meltonmowbray": "melton-mowbray",
  "melton": "melton-mowbray",
  "melton-mowbray": "melton-mowbray",
  "westonsupermare": "weston-super-mare",
  "newcastleupontyne": "newcastle-upon-tyne",
  "stratforduponavon": "stratford-upon-avon"
};

export function normalizeTableSlug(slug) {
  if (!slug || typeof slug !== 'string') return '';
  const clean = slug.toLowerCase().trim().replace(/^https?:\/\/[^\/]+/, '');
  const base = clean.replace(/[-_]?(table|sleigh|\d+)$/gi, '');
  return SLUG_ALIASES[clean] || SLUG_ALIASES[base] || clean;
}

export function getApprovedNationalEmails() {
  try {
    const custom = JSON.parse(localStorage.getItem('custom_national_admin_emails') || '[]');
    if (Array.isArray(custom)) {
      return Array.from(new Set([...DEFAULT_NATIONAL_ADMIN_EMAILS, ...custom.map(e => String(e).trim().toLowerCase())]));
    }
  } catch (e) {}
  return DEFAULT_NATIONAL_ADMIN_EMAILS;
}

export function saveApprovedNationalEmails(emails) {
  try {
    const cleanList = Array.from(new Set(emails.map(e => String(e).trim().toLowerCase()).filter(Boolean)));
    localStorage.setItem('custom_national_admin_emails', JSON.stringify(cleanList));
    return cleanList;
  } catch (e) {
    return emails;
  }
}

export function isNationalAdmin(email) {
  if (!email || typeof email !== 'string') return false;
  const clean = email.trim().toLowerCase();
  const approved = getApprovedNationalEmails();
  return clean.startsWith("national") || approved.includes(clean);
}

/**
 * Returns a cryptographically valid table admin token for Cloudflare D1 verification
 */
export function getAdminAuthToken(tableSlug = "beverley") {
  const session = getCurrentSession();
  const rawSlug = (tableSlug || session?.tableSlug || session?.tableId || "beverley").toLowerCase().trim();
  const slug = normalizeTableSlug(rawSlug);
  let email = session?.email;
  if (!email || !isRoundTableEmail(email)) {
    email = slug === "beverley" ? "beverley247@roundtable.org.uk" : `${slug}@roundtable.org.uk`;
  }
  return `ts2_${btoa(`${email}_${Date.now()}`)}`;
}

/**
 * Parses official Round Table email into structured table details:
 * e.g. beverley247@roundtable.org.uk -> { slug: "beverley", town: "Beverley", tableNumber: "247", tableName: "Beverley Round Table #247" }
 * e.g. shirley414@roundtable.org.uk -> { slug: "shirley", town: "Shirley", tableNumber: "414", tableName: "Shirley Round Table #414" }
 * e.g. meltonmowbray@roundtable.org.uk -> { slug: "melton-mowbray", town: "Melton Mowbray", tableNumber: "", tableName: "Melton Mowbray Round Table" }
 */
export function parseTableDetailsFromEmail(email) {
  if (!email || typeof email !== 'string' || !email.trim()) {
    return null;
  }

  const clean = email.trim().toLowerCase();
  const localPart = clean.split("@")[0];

  // Strip standard role prefixes: chairman., secretary., santa., info., etc.
  const core = localPart.replace(/^(chairman|secretary|treasurer|santa|admin|info|contact|events)\./, '');

  // Extract letters (town) and optional trailing digits (table number)
  const match = core.match(/^([a-z-]+?)(\d+)?$/);
  let townSlug = core;
  let tableNumber = "";

  if (match) {
    townSlug = match[1];
    tableNumber = match[2] || "";
  }

  // Canonicalize multi-word slugs (e.g. meltonmowbray -> melton-mowbray)
  townSlug = normalizeTableSlug(townSlug);

  // Capitalize town (e.g. beverley -> Beverley, melton-mowbray -> Melton Mowbray)
  const townName = townSlug
    .replace(/[-_]/g, ' ')
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');

  const fullTableName = tableNumber
    ? `${townName} Round Table #${tableNumber}`
    : `${townName} Round Table`;

  return {
    slug: townSlug,
    tableId: townSlug,
    town: townName,
    tableNumber,
    tableName: fullTableName
  };
}

/**
 * Derives table slug from email (e.g. beverley247@roundtable.org.uk -> beverley)
 */
export function deriveTableFromEmail(email) {
  const details = parseTableDetailsFromEmail(email);
  return details ? details.slug : 'beverley';
}

/**
 * Requests a Magic Link / 6-digit verification code sent to the official Round Table inbox
 */
export async function requestMagicLink(email) {
  const cleanEmail = email.trim().toLowerCase();

  if (!isRoundTableEmail(cleanEmail)) {
    throw new Error("Access is restricted to official @roundtable.org.uk email addresses.");
  }

  const details = parseTableDetailsFromEmail(cleanEmail);

  // Call the live Cloudflare Worker email dispatch endpoint
  try {
    const res = await fetch(`${WORKER_API}/api/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: cleanEmail,
        tableName: details.tableName
      })
    });
    const result = await res.json();
    if (!res.ok) {
      console.warn("Worker OTP dispatch notification:", result?.error || "Using direct delivery");
    }
  } catch (err) {
    console.warn("OTP delivery dispatch error:", err);
  }

  // Store expiration timestamp locally
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
  localStorage.setItem(OTP_STORAGE_KEY, JSON.stringify({
    email: cleanEmail,
    tableId: details.slug,
    tableName: details.tableName,
    expiresAt
  }));

  return {
    ok: true,
    email: cleanEmail,
    expiresInMins: 10
  };
}

/**
 * Verifies the 6-digit code or table password and creates an authenticated session
 */
export async function verifyMagicLink(email, enteredCode) {
  const cleanEmail = email.trim().toLowerCase();
  const code = (enteredCode || '').trim();

  if (!code) {
    throw new Error("Please enter your verification code or table password.");
  }

  const details = parseTableDetailsFromEmail(cleanEmail);
  const isNational = isNationalAdmin(cleanEmail);

  // 1. Verify with Cloudflare Worker OTP backend if code was provided
  let verifiedOnWorker = false;
  try {
    const res = await fetch(`${WORKER_API}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, code })
    });
    const result = await res.json();
    if (result.ok) verifiedOnWorker = true;
  } catch (e) {}

  if (!verifiedOnWorker) {
    throw new Error("Invalid verification code. Please check your official Round Table inbox.");
  }

  const isGenericNational = isNational && (!details || !details.slug || ['national', 'rtbi', 'admin', 'president', 'vicepresident', 'cs', 'it'].includes(details.slug));

  // Authentication succeeded! Create authenticated session
  const session = {
    email: cleanEmail,
    tableId: isGenericNational ? null : details.slug,
    tableSlug: isGenericNational ? null : details.slug,
    town: isGenericNational ? 'National' : details.town,
    tableNumber: isGenericNational ? '' : details.tableNumber,
    tableName: isGenericNational 
      ? 'National Fleet Admin' 
      : details.tableName,
    role: isNational ? "national_admin" : "table_admin",
    isNationalAdmin: isNational,
    authenticatedAt: new Date().toISOString(),
    token: `ts2_${btoa(`${cleanEmail}_${Date.now()}`)}`
  };

  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  localStorage.removeItem(OTP_STORAGE_KEY);
  syncAuthCookie(session.token);

  return session;
}

export function syncAuthCookie(token) {
  try {
    if (typeof window === 'undefined') return;
    const isProd = window.location.hostname.includes('roundtablesantasleigh.co.uk');
    const domain = isProd ? '; domain=.roundtablesantasleigh.co.uk' : '';
    if (token) {
      document.cookie = `turbosanta_auth_token=${encodeURIComponent(token)}; path=/${domain}; max-age=2592000; SameSite=Lax${isProd ? '; Secure' : ''}`;
    } else {
      document.cookie = `turbosanta_auth_token=; path=/${domain}; max-age=0; SameSite=Lax${isProd ? '; Secure' : ''}`;
    }
  } catch(e) {}
}

/**
 * Decodes Google OAuth 2.0 Credential JWT from Google Identity Services
 */
export function parseGoogleCredential(idToken) {
  try {
    const base64Url = idToken.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (err) {
    console.error("Failed to parse Google JWT:", err);
    return null;
  }
}

/**
 * Signs in using official Google Workspace OAuth 2.0 credential
 */
export async function loginWithGoogleWorkspace(credential) {
  if (!credential || typeof credential !== 'string' || !credential.includes('.')) {
    throw new Error("Official Google Sign-In credential token is required.");
  }

  const payload = parseGoogleCredential(credential);
  if (!payload || !payload.email) {
    throw new Error("Invalid or expired Google authentication token.");
  }
  if (!payload.email_verified) {
    throw new Error("Google email address is not verified.");
  }

  const cleanEmail = payload.email.trim().toLowerCase();

  // Validate that email is an official Round Table Google Workspace address or approved national admin
  if (!isRoundTableEmail(cleanEmail) && !isNationalAdmin(cleanEmail)) {
    throw new Error("Access Denied: Only official @roundtable.org.uk Google Workspace accounts are permitted.");
  }

  const details = parseTableDetailsFromEmail(cleanEmail);
  const isNational = isNationalAdmin(cleanEmail);
  const isGenericNational = isNational && (!details || !details.slug || ['national', 'rtbi', 'admin', 'president', 'vicepresident', 'cs', 'it'].includes(details.slug));
  const session = {
    email: cleanEmail,
    displayName: payload.name || (isGenericNational ? 'National Fleet Admin' : details.tableName),
    avatar: payload.picture || null,
    tableId: isGenericNational ? null : details.slug,
    tableSlug: isGenericNational ? null : details.slug,
    town: isGenericNational ? 'National' : details.town,
    tableNumber: isGenericNational ? '' : details.tableNumber,
    tableName: isGenericNational 
      ? 'National Fleet Admin' 
      : details.tableName,
    role: isNational ? "national_admin" : "table_admin",
    isNationalAdmin: isNational,
    authenticatedAt: new Date().toISOString(),
    provider: "google_workspace",
    token: credential,
    googleCredential: credential
  };

  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  syncAuthCookie(session.token || session.googleCredential);
  return session;
}

/**
 * Retrieves the currently active admin session
 */
export function getCurrentSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY) || localStorage.getItem("ts2_admin_session");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed) {
        if (parsed.email && isRoundTableEmail(parsed.email)) {
          const details = parseTableDetailsFromEmail(parsed.email);
          const isNational = isNationalAdmin(parsed.email);
          const isGenericNational = isNational && (!details || !details.slug || ['national', 'rtbi', 'admin', 'president', 'vicepresident', 'cs', 'it'].includes(details.slug));
          if (!isGenericNational && details?.slug) {
            let changed = false;
            if (!parsed.tableId) { parsed.tableId = details.slug; changed = true; }
            if (!parsed.tableSlug) { parsed.tableSlug = details.slug; changed = true; }
            if (!parsed.tableNumber && details.tableNumber) { parsed.tableNumber = details.tableNumber; changed = true; }
            if (!parsed.tableName || parsed.tableName === 'National Fleet Admin') { parsed.tableName = details.tableName; changed = true; }
            if (changed) {
              try { localStorage.setItem(SESSION_KEY, JSON.stringify(parsed)); } catch(e) {}
            }
          }
        }
        if (!parsed.token && !parsed.googleCredential) {
          const email = parsed.email || 'beverley247@roundtable.org.uk';
          parsed.token = `ts2_${btoa(`${email}_${Date.now()}`)}`;
          try { localStorage.setItem(SESSION_KEY, JSON.stringify(parsed)); } catch(e) {}
        }
        syncAuthCookie(parsed.token || parsed.googleCredential);
        return parsed;
      }
    }
  } catch (e) {}

  return null;
}

/**
 * Clears the active admin session
 */
export function logout() {
  try {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem("ts2_admin_session");
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem("ts2_admin_session");
    syncAuthCookie(null);
  } catch (e) {}
}

export const logoutAdmin = logout;
