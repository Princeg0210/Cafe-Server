// fetch() for the owner admin portal that survives access-token expiry.
// Only requests that carry an Authorization header are managed: the latest stored token is
// attached, and on a 401 the refresh token is exchanged once and the request retried.
// If renewal fails, ADMIN_SESSION_EXPIRED is dispatched so the page can show the login screen.

export const ADMIN_TOKEN_KEY = "jaadoo_admin_token";
export const ADMIN_REFRESH_KEY = "jaadoo_admin_refresh_token";
export const ADMIN_SESSION_EXPIRED = "jaadoo-admin-session-expired";
export const ADMIN_TOKEN_REFRESHED = "jaadoo-admin-token-refreshed";

let refreshInFlight: Promise<string | null> | null = null;

function refreshAdminToken(): Promise<string | null> {
  // Share one refresh between requests that hit 401 at the same time
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const refreshToken = localStorage.getItem(ADMIN_REFRESH_KEY);
      if (!refreshToken) return null;
      try {
        const res = await fetch("/api/v1/auth/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
        if (!res.ok) return null;
        const data = await res.json();
        localStorage.setItem(ADMIN_TOKEN_KEY, data.access_token);
        if (data.refresh_token) localStorage.setItem(ADMIN_REFRESH_KEY, data.refresh_token);
        window.dispatchEvent(new CustomEvent(ADMIN_TOKEN_REFRESHED, { detail: data.access_token }));
        return data.access_token as string;
      } catch {
        return null;
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

export async function adminFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (!headers.has("Authorization")) return fetch(input, init);

  const withToken = (token: string): RequestInit => {
    const h = new Headers(init.headers);
    h.set("Authorization", `Bearer ${token}`);
    return { ...init, headers: h };
  };

  const stored = localStorage.getItem(ADMIN_TOKEN_KEY);
  const res = await fetch(input, stored ? withToken(stored) : init);
  if (res.status !== 401) return res;

  const fresh = await refreshAdminToken();
  if (!fresh) {
    window.dispatchEvent(new Event(ADMIN_SESSION_EXPIRED));
    return res;
  }
  return fetch(input, withToken(fresh));
}
