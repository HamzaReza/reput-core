const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

// ── Token helpers ─────────────────────────────────────────────────────────────

export function getToken(): string | null {
  try {
    return localStorage.getItem("reput_token");
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  try {
    localStorage.setItem("reput_token", token);
  } catch {}
}

export function clearAuth(): void {
  try {
    const splash = localStorage.getItem("reput_splash_shown");
    localStorage.clear();
    if (splash) localStorage.setItem("reput_splash_shown", splash);
  } catch {}
}

export function isAuthed(): boolean {
  return !!getToken();
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  user_id: string;
  avatar_url: string | null;
  linkedin_url: string | null;
  bio: string | null;
  company: string | null;
  job_title: string | null;
  keywords: string[];
  notification_email: boolean;
  notification_sms: boolean;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  profile: UserProfile | null;
}

export interface AuthResponse {
  user: User;
  access_token: string;
  token_type: string;
}

export interface ReputationResult {
  source: string;
  url: string;
  title: string;
  snippet: string;
  risk: string;
  type: string;
}

export interface ReputationScan {
  id: string;
  user_id: string;
  score: number;
  risk_level: string;
  results: ReputationResult[];
  summary: {
    total_results: number;
    high_risk: number;
    medium_risk: number;
    low_risk: number;
  };
  scanned_at: string;
}

export interface QuotePayload {
  name: string;
  email: string;
  phone?: string;
  plan_type: string;
  message?: string;
  details?: Record<string, unknown>;
}

export interface ApiError {
  detail: string;
}

// ── Core fetch wrapper ────────────────────────────────────────────────────────

function networkErrorMessage(): string {
  return `Cannot reach the API at ${BASE_URL}. Start the backend: cd reput-projects && docker compose up`;
}

async function fetchWithHelp(url: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (e) {
    if (e instanceof TypeError) {
      throw new Error(networkErrorMessage());
    }
    throw e;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  withAuth = false
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (withAuth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetchWithHelp(`${BASE_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const err: ApiError = await res.json().catch(() => ({
      detail: `Request failed with status ${res.status}`,
    }));
    throw new Error(err.detail || "An unexpected error occurred.");
  }

  // 204 No Content
  if (res.status === 204) return undefined as unknown as T;

  return res.json() as Promise<T>;
}

// ── Auth endpoints ────────────────────────────────────────────────────────────

export const auth = {
  register: (email: string, password: string, name?: string) =>
    request<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    }),

  login: (email: string, password: string) => {
    const form = new URLSearchParams();
    form.append("username", email);
    form.append("password", password);
    return fetchWithHelp(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    }).then(async (res) => {
      if (!res.ok) {
        const err: ApiError = await res.json().catch(() => ({
          detail: "Login failed.",
        }));
        throw new Error(err.detail || "Login failed.");
      }
      return res.json() as Promise<AuthResponse>;
    });
  },

  me: () => request<User>("/auth/me", {}, true),
};

// ── User / Profile endpoints ──────────────────────────────────────────────────

export const users = {
  updateMe: (data: { name?: string; phone?: string }) =>
    request<User>("/users/me", { method: "PATCH", body: JSON.stringify(data) }, true),

  getProfile: () => request<UserProfile>("/users/me/profile", {}, true),

  upsertProfile: (data: Partial<UserProfile>) =>
    request<UserProfile>(
      "/users/me/profile",
      { method: "PUT", body: JSON.stringify(data) },
      true
    ),
};

// ── Reputation endpoints ──────────────────────────────────────────────────────

export const reputation = {
  triggerScan: () =>
    request<ReputationScan>("/reputation/scan", { method: "POST" }, true),

  getLatest: () =>
    request<ReputationScan | null>("/reputation/latest", {}, true),

  getHistory: (limit = 10, offset = 0) =>
    request<ReputationScan[]>(
      `/reputation/history?limit=${limit}&offset=${offset}`,
      {},
      true
    ),
};

// ── Quotes endpoints ──────────────────────────────────────────────────────────

export const quotes = {
  submit: (payload: QuotePayload) =>
    request<{ id: string }>(
      "/quotes/authenticated",
      { method: "POST", body: JSON.stringify(payload) },
      true
    ),

  submitGuest: (payload: QuotePayload) =>
    request<{ id: string }>("/quotes", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getMyQuotes: () => request<unknown[]>("/quotes/my", {}, true),
};
