// client/lib/apiFetch.ts
export async function apiFetch(path: string, options: RequestInit = {}) {
  const API_URL = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
  const token =
    typeof window !== "undefined" ? localStorage.getItem("infrapilot_token") : null;

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    // don't use credentials unless you're truly using cookie auth
    // credentials: "include",
  });

  return res;
}
