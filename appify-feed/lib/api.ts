const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
  const response = await fetch(`${API_URL}/api${path}`, {
    ...options,
    headers,
    credentials: "include",
  });
  if (response.status === 204) return undefined as T;
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error?.message || "Request failed.");
  return payload.data;
}

export function mediaUrl(path: string | null | undefined) {
  if (!path) return "/assets/images/profile.png";
  return path.startsWith("http") ? path : `${API_URL}${path}`;
}

export const realtimeUrl = API_URL;
