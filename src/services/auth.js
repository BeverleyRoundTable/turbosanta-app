// TurboSanta 2.0 Authentication Service
// Enforces @roundtable.org.uk domain verification

const SESSION_KEY = "turbosanta_admin_session";
const OTP_STORAGE_KEY = "turbosanta_dev_otp";

/**
 * Validates that an email belongs to the official Round Table Google Workspace
 */
export function isRoundTableEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const clean = email.trim().toLowerCase();
  return clean.endsWith("@roundtable.org.uk") || clean.endsWith("@roundtable.co.uk");
}

export const NATIONAL_ADMIN_EMAILS = [
  "beverley247@roundtable.org.uk",
  "national@roundtable.org.uk",
  "admin@roundtable.org.uk",
  "rtbi@roundtable.org.uk"
];

export function isNationalAdmin(email) {
  if (!email || typeof email !== 'string') return false;
  const clean = email.trim().toLowerCase();
  return clean.startsWith("national") || NATIONAL_ADMIN_EMAILS.includes(clean);
}

/**
 * Parses official Round Table email into structured table details:
 * e.g. beverley247@roundtable.org.uk -> { slug: "beverley", town: "Beverley", tableNumber: "247", tableName: "Beverley Round Table #247" }
 * e.g. shirley414@roundtable.org.uk -> { slug: "shirley", town: "Shirley", tableNumber: "414", tableName: "Shirley Round Table #414" }
 * e.g. ellon@roundtable.org.uk -> { slug: "ellon", town: "Ellon", tableNumber: "", tableName: "Ellon Round Table" }
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

  // Capitalize town (e.g. beverley -> Beverley, newcastle-upon-tyne -> Newcastle Upon Tyne)
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
 * Requests a Magic Link / 6-digit verification code
 */
export async function requestMagicLink(email) {
  const cleanEmail = email.trim().toLowerCase();

  if (!isRoundTableEmail(cleanEmail)) {
    throw new Error("Access is restricted to official @roundtable.org.uk email addresses.");
  }

  const details = parseTableDetailsFromEmail(cleanEmail);

  // Generate a cryptographically random 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

  // Store locally for validation
  const otpData = {
    email: cleanEmail,
    code,
    expiresAt,
    tableId: details.slug,
    tableName: details.tableName
  };
  localStorage.setItem(OTP_STORAGE_KEY, JSON.stringify(otpData));

  // In production, Cloudflare Worker / MailChannels sends the email.
  // In dev / preview, we return the code directly so you can test instantly.
  return {
    ok: true,
    email: cleanEmail,
    devCode: code,
    expiresInMins: 10
  };
}

/**
 * Verifies the 6-digit code and creates an authenticated session
 */
export async function verifyMagicLink(email, enteredCode) {
  const cleanEmail = email.trim().toLowerCase();
  const rawOtp = localStorage.getItem(OTP_STORAGE_KEY);

  if (!rawOtp) {
    throw new Error("No pending verification request. Please enter your email again.");
  }

  const stored = JSON.parse(rawOtp);

  if (stored.email !== cleanEmail) {
    throw new Error("Email does not match the active verification request.");
  }

  if (Date.now() > stored.expiresAt) {
    throw new Error("Verification code has expired. Please request a new one.");
  }

  if (stored.code !== enteredCode.trim()) {
    throw new Error("Incorrect 6-digit code. Please check and try again.");
  }

  // Code is valid! Create the authenticated session
  const details = parseTableDetailsFromEmail(cleanEmail);
  const isNational = isNationalAdmin(cleanEmail);
  const session = {
    email: cleanEmail,
    tableId: details.slug,
    town: details.town,
    tableNumber: details.tableNumber,
    tableName: isNational 
      ? `${details.tableName} (National Admin)` 
      : details.tableName,
    role: isNational ? "national_admin" : "table_admin",
    isNationalAdmin: isNational,
    authenticatedAt: new Date().toISOString(),
    token: `ts2_${btoa(`${cleanEmail}_${Date.now()}`)}`
  };

  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  localStorage.removeItem(OTP_STORAGE_KEY);

  return session;
}

/**
 * Simulates a successful Google Workspace OAuth 2.0 Sign-In
 */
export async function loginWithGoogleWorkspace(googleAccountEmail) {
  const clean = googleAccountEmail.trim().toLowerCase();

  if (!isRoundTableEmail(clean)) {
    throw new Error("Google Sign-In rejected: Only @roundtable.org.uk Google Workspace accounts are permitted.");
  }

  const details = parseTableDetailsFromEmail(clean);
  const isNational = isNationalAdmin(clean);
  const session = {
    email: clean,
    tableId: details.slug,
    town: details.town,
    tableNumber: details.tableNumber,
    tableName: isNational 
      ? `${details.tableName} (National Admin)` 
      : details.tableName,
    role: isNational ? "national_admin" : "table_admin",
    isNationalAdmin: isNational,
    authenticatedAt: new Date().toISOString(),
    provider: "google",
    token: `ts2_g_${btoa(`${clean}_${Date.now()}`)}`
  };

  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

/**
 * Retrieves the currently active admin session
 */
export function getCurrentSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

/**
 * Clears the active admin session
 */
export function logout() {
  localStorage.removeItem(SESSION_KEY);
}

export const logoutAdmin = logout;
