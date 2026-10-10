// fetch() for staff portals (owner admin, POS) that survives access-token expiry.
// Only requests that carry an Authorization header are managed: the latest stored token is
// attached, and on a 401 the refresh token is exchanged once and the request retried.
// If renewal fails, the portal's `expiredEvent` is dispatched so it can show its login screen.

export interface StaffSession {
  tokenKey: string;
  refreshKey: string;
  expiredEvent: string;
  refreshedEvent: string;
  fetch: (input: string, init?: RequestInit) => Promise<Response>;
}

function createStaffSession(prefix: string): StaffSession {
  const tokenKey = `jaadoo_${prefix}_token`;
  const refreshKey = `jaadoo_${prefix}_refresh_token`;
  const expiredEvent = `jaadoo-${prefix}-session-expired`;
  const refreshedEvent = `jaadoo-${prefix}-token-refreshed`;
  let refreshInFlight: Promise<string | null> | null = null;

  const refresh = (): Promise<string | null> => {
    // Share one refresh between requests that hit 401 at the same time
    if (!refreshInFlight) {
      refreshInFlight = (async () => {
        const refreshToken = localStorage.getItem(refreshKey);
        if (!refreshToken) return null;
        try {
          const res = await fetch("/api/v1/auth/refresh", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refresh_token: refreshToken }),
          });
          if (!res.ok) return null;
          const data = await res.json();
          localStorage.setItem(tokenKey, data.access_token);
          if (data.refresh_token) localStorage.setItem(refreshKey, data.refresh_token);
          window.dispatchEvent(new CustomEvent(refreshedEvent, { detail: data.access_token }));
          return data.access_token as string;
        } catch {
          return null;
        } finally {
          refreshInFlight = null;
        }
      })();
    }
    return refreshInFlight;
  };

  const sessionFetch = async (input: string, init: RequestInit = {}): Promise<Response> => {
    if (!new Headers(init.headers).has("Authorization")) return fetch(input, init);

    const withToken = (token: string): RequestInit => {
      const h = new Headers(init.headers);
      h.set("Authorization", `Bearer ${token}`);
      return { ...init, headers: h };
    };

    const stored = localStorage.getItem(tokenKey);
    const res = await fetch(input, stored ? withToken(stored) : init);
    if (res.status !== 401) return res;

    const fresh = await refresh();
    if (!fresh) {
      window.dispatchEvent(new Event(expiredEvent));
      return res;
    }
    return fetch(input, withToken(fresh));
  };

  return { tokenKey, refreshKey, expiredEvent, refreshedEvent, fetch: sessionFetch };
}

export const adminSession = createStaffSession("admin");
export const posSession = createStaffSession("pos");
