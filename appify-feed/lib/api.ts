const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const AUTH_TOKEN_KEY = "appify_token";

function hasBrowserStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getAuthToken() {
  if (!hasBrowserStorage()) return null;
  try {
    return window.localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

function setAuthToken(token: string) {
  if (!hasBrowserStorage()) return;
  try {
    window.localStorage.setItem(AUTH_TOKEN_KEY, token);
  } catch {
    // Cookies remain the primary auth path when browser storage is unavailable.
  }
}

export function clearAuthToken() {
  if (!hasBrowserStorage()) return;
  try {
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
  } catch {
    // Nothing to clear if storage is blocked.
  }
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const token = getAuthToken();
  if (token && !headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
  const response = await fetch(`${API_URL}/api${path}`, {
    ...options,
    headers,
    credentials: "include",
  });
  if (response.status === 204) return undefined as T;
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error?.message || "Request failed.");
  if (typeof payload.data?.token === "string") setAuthToken(payload.data.token);
  return payload.data;
}

export function realtimeAuthOptions() {
  const token = getAuthToken();
  return {
    withCredentials: true,
    auth: token ? { token } : undefined,
  };
}

export function mediaUrl(path: string | null | undefined) {
  if (!path) return "/assets/images/profile.png";
  return path.startsWith("http") ? path : `${API_URL}${path}`;
}

export const realtimeUrl = API_URL;
