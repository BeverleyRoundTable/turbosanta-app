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
  "rtbi@roundtable.org.uk",
  "president@roundtable.org.uk",
  "vicepresident@roundtable.org.uk",
  "secretary@roundtable.org.uk",
  "media@roundtable.org.uk",
  "communications@roundtable.org.uk",
  "treasurer@roundtable.org.uk",
  "cs@roundtable.org.uk",
  "it@roundtable.org.uk"
];

export const SLUG_ALIASES = {
  "meltonmowbray": "melton-mowbray",
  "melton": "melton-mowbray",
  "melton-mowbray": "melton-mowbray",
  "westonsupermare": "weston-super-mare",
  "newcastleupontyne": "newcastle-upon-tyne",
  "stratforduponavon": "stratford-upon-avon",
  "darlington": "darlington",
  "darlingtonbondgate": "darlington",
  "darlington-bondgate": "darlington",
  "darlingtontongate": "darlington"
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
 * Returns the cryptographically signed admin session token issued by the Cloudflare Worker
 */
export function getAdminAuthToken() {
  const session = getCurrentSession();
  if (session?.token && (session.token.startsWith("ts2_sig_") || session.token.includes("."))) {
    return session.token;
  }
  if (session?.googleCredential && session.googleCredential.includes(".")) {
    return session.googleCredential;
  }
  try {
    if (typeof document !== "undefined" && document.cookie) {
      const m = document.cookie.match(/(?:^|;\s*)turbosanta_auth_token=([^;]+)/);
      if (m && m[1]) {
        const cookieTok = decodeURIComponent(m[1]).trim();
        if (cookieTok.startsWith("ts2_sig_") || cookieTok.includes(".")) {
          return cookieTok;
        }
      }
    }
  } catch (e) {}
  return "";
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

  const NATIONAL_ROLES = [
    "national", "rtbi", "admin", "president", "vicepresident",
    "secretary", "media", "communications", "treasurer", "cs", "it"
  ];
  if (NATIONAL_ROLES.includes(localPart) || clean.startsWith("national@") || clean.startsWith("rtbi@")) {
    return {
      slug: null,
      tableId: null,
      town: 'National',
      tableNumber: '',
      tableName: 'National Fleet Admin',
      isNational: true
    };
  }

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
 * Verifies the 6-digit code and creates an authenticated session with a server-signed HMAC token
 */
export async function verifyMagicLink(email, enteredCode) {
  const cleanEmail = email.trim().toLowerCase();
  const code = (enteredCode || '').trim();

  if (!code) {
    throw new Error("Please enter your verification code.");
  }

  const details = parseTableDetailsFromEmail(cleanEmail);
  const isNational = isNationalAdmin(cleanEmail);

  // Verify with Cloudflare Worker OTP backend and receive HMAC-signed session token
  let verifiedOnWorker = false;
  let signedToken = "";
  try {
    const res = await fetch(`${WORKER_API}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, code, tableSlug: details?.slug || "beverley" })
    });
    const result = await res.json();
    if (result.ok && result.token) {
      verifiedOnWorker = true;
      signedToken = result.token;
    }
  } catch (e) {}

  if (!verifiedOnWorker || !signedToken) {
    throw new Error("Invalid verification code. Please check your official Round Table inbox.");
  }

  const isBeverley = cleanEmail === 'beverley247@roundtable.org.uk' || cleanEmail.includes('beverley') || details?.slug === 'beverley';
  const isGenericNational = isNational && !isBeverley;

  // Authentication succeeded! Create authenticated session with server-signed token
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
    token: signedToken
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
 * Signs in using official Google Workspace OAuth 2.0 credential and exchanges for a 30-day HMAC-signed session token
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
  const isBeverley = cleanEmail === 'beverley247@roundtable.org.uk' || cleanEmail.includes('beverley') || details?.slug === 'beverley';
  const isGenericNational = isNational && !isBeverley;

  let signedSessionToken = credential;
  try {
    const res = await fetch(`${WORKER_API}/api/auth/google-session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        credential,
        tableSlug: isGenericNational ? "national" : (details?.slug || "beverley")
      })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || "Google Sign-In verification failed on server.");
    }
    if (data.ok && data.token) {
      signedSessionToken = data.token;
    }
  } catch (err) {
    if (err.message && err.message.includes("Access Denied")) {
      throw err;
    }
    console.warn("Could not exchange Google JWT for signed session token, using raw Google JWT:", err);
  }

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
    token: signedSessionToken,
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
        // Reject legacy unsigned client-fabricated ts2_ tokens
        if (parsed.token && parsed.token.startsWith("ts2_") && !parsed.token.startsWith("ts2_sig_")) {
          if (parsed.googleCredential && parsed.googleCredential.includes(".")) {
            parsed.token = parsed.googleCredential;
            try { localStorage.setItem(SESSION_KEY, JSON.stringify(parsed)); } catch (e) {}
          } else {
            logout();
            return null;
          }
        }
        if (!parsed.token && parsed.googleCredential && parsed.googleCredential.includes(".")) {
          parsed.token = parsed.googleCredential;
        }
        if (!parsed.token) {
          logout();
          return null;
        }
        if (parsed.email && isRoundTableEmail(parsed.email)) {
          const details = parseTableDetailsFromEmail(parsed.email);
          const isNational = isNationalAdmin(parsed.email);
          const isBeverley = parsed.email.toLowerCase().trim() === 'beverley247@roundtable.org.uk' || parsed.email.toLowerCase().includes('beverley') || details?.slug === 'beverley';
          const isGenericNational = isNational && !isBeverley;
          if (!isGenericNational && details?.slug) {
            let changed = false;
            if (!parsed.tableId) { parsed.tableId = details.slug; changed = true; }
            if (!parsed.tableSlug) { parsed.tableSlug = details.slug; changed = true; }
            if (!parsed.tableNumber && details.tableNumber) { parsed.tableNumber = details.tableNumber; changed = true; }
            if (!parsed.tableName || parsed.tableName === 'National Fleet Admin') { parsed.tableName = details.tableName; changed = true; }
            if (changed) {
              try { localStorage.setItem(SESSION_KEY, JSON.stringify(parsed)); } catch(e) {}
            }
          } else if (isGenericNational) {
            let changed = false;
            if (parsed.tableId !== null) { parsed.tableId = null; changed = true; }
            if (parsed.tableSlug !== null) { parsed.tableSlug = null; changed = true; }
            if (parsed.tableName !== 'National Fleet Admin') { parsed.tableName = 'National Fleet Admin'; changed = true; }
            if (parsed.town !== 'National') { parsed.town = 'National'; changed = true; }
            if (!parsed.isNationalAdmin) { parsed.isNationalAdmin = true; changed = true; }
            if (changed) {
              try { localStorage.setItem(SESSION_KEY, JSON.stringify(parsed)); } catch(e) {}
            }
          }
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
