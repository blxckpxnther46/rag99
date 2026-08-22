const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export async function api<T>(path: string, init: RequestInit = {}) {
  const token = typeof window === "undefined"
    ? ""
    : localStorage.getItem("rag99_token") ?? "";

  const headers = new Headers(init.headers);

  if (!(init.body instanceof FormData)) {
    headers.set("content-type", "application/json");
  }

  if (token) {
    headers.set("authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${base}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("rag99_token");
        window.location.href = "/login";
      }
    }
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error ?? "Request failed");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function setToken(token: string) {
  localStorage.setItem("rag99_token", token);
}

export function clearToken() {
  localStorage.removeItem("rag99_token");
}
