const SESSION_KEY = "wasteless_kb_admin_unlocked";
const SESSION_EXPIRY_KEY = "wasteless_kb_admin_expires";
const PASSWORD_KEY = "wasteless_kb_admin_password";
const SESSION_MS = 4 * 60 * 60 * 1000;

export function isKbAdminSessionValid(): boolean {
  if (typeof window === "undefined") return false;
  const unlocked = sessionStorage.getItem(SESSION_KEY);
  const expires = sessionStorage.getItem(SESSION_EXPIRY_KEY);
  if (unlocked !== "1" || !expires) return false;
  if (Date.now() > Number(expires)) {
    clearKbAdminSession();
    return false;
  }
  return true;
}

export function setKbAdminSession(password?: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(SESSION_KEY, "1");
  sessionStorage.setItem(SESSION_EXPIRY_KEY, String(Date.now() + SESSION_MS));
  if (password) {
    sessionStorage.setItem(PASSWORD_KEY, password);
  }
}

export function clearKbAdminSession(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_EXPIRY_KEY);
  sessionStorage.removeItem(PASSWORD_KEY);
}

export function getKbAdminPassword(): string | null {
  if (typeof window === "undefined") return null;
  if (!isKbAdminSessionValid()) return null;
  return sessionStorage.getItem(PASSWORD_KEY);
}

/** Verify admin password via server — never compare client-side. */
export async function verifyKbAdminPassword(
  password: string
): Promise<boolean> {
  try {
    const res = await fetch("/api/kb/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) return false;
    const json = (await res.json()) as { ok?: boolean };
    if (json.ok) {
      setKbAdminSession(password);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function aiNormalizeImportRow(
  row: import("./import/types").ParsedImportRow
): Promise<import("./import/types").ParsedImportRow> {
  if (!isKbAdminSessionValid()) return row;
  const res = await fetch("/api/kb/normalize-row", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ row: row.raw }),
  });
  if (!res.ok) return row;
  const json = (await res.json()) as {
    brand?: string;
    name?: string;
    variant?: string;
    size?: string;
    unit?: string;
    category?: string;
  };
  return {
    ...row,
    brand: json.brand?.trim() || row.brand,
    name: json.name?.trim() || row.name,
    variant: json.variant?.trim() || row.variant,
    size: json.size?.trim() || row.size,
    unit: json.unit?.trim() || row.unit,
    category: json.category?.trim() || row.category,
    confidence: 0.85,
    errors: row.name ? [] : row.errors,
  };
}
