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
  try {
    sessionStorage.clear();
  } catch {}
}

export function isAuthed(): boolean {
  return !!getToken();
}

export function getRole(): "admin" | "analyst" | null {
  try {
    const raw = localStorage.getItem("reput_user");
    if (!raw) return null;
    const u = JSON.parse(raw);
    return u.role ?? null;
  } catch { return null; }
}

export function isAdmin(): boolean {
  return getRole() === "admin";
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

export type ScanDepth = "Standard" | "Deep" | "Thorough";

export interface User {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  nationality: string | null;
  date_of_birth: string | null;
  scan_depth: ScanDepth;
  profile_complete: boolean;
  is_active: boolean;
  is_verified: boolean;
  plan: string;
  pro_trial_expires_at: string | null;
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

export interface ContractLink {
  url: string;
  title: string;
}

export interface Contract {
  id: string;
  user_id: string;
  links: ContractLink[];
  notes: string | null;
  status: string;
  created_at: string;
}

/** FastAPI returns `detail` as a string (HTTPException) or a list (validation). */
function parseFastApiDetail(body: unknown): string {
  if (!body || typeof body !== "object") return "";
  const d = (body as { detail?: unknown }).detail;
  if (typeof d === "string") return d;
  if (Array.isArray(d)) {
    return d
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && "msg" in item) {
          return String((item as { msg: string }).msg);
        }
        return "";
      })
      .filter(Boolean)
      .join(" ");
  }
  return "";
}

// ── Core fetch wrapper ────────────────────────────────────────────────────────

function networkErrorMessage(): string {
  return `Cannot reach the API at ${BASE_URL}. Start the backend: cd reput-projects && docker compose up`;
}

async function fetchWithHelp(
  url: string,
  init?: RequestInit,
): Promise<Response> {
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
  withAuth = false,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (withAuth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetchWithHelp(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    if (withAuth && res.status === 401) {
      clearAuth();
      if (typeof window !== "undefined") {
        window.location.replace("/login?reason=session_expired");
        return new Promise(() => {}) as Promise<T>;
      }
    }
    const parsed = await res.json().catch(() => null);
    const msg =
      parseFastApiDetail(parsed) || `Request failed with status ${res.status}`;
    throw new Error(msg);
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

  login: async (email: string, password: string) => {
    const form = new URLSearchParams();
    form.append("username", email);
    form.append("password", password);
    return fetchWithHelp(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    }).then(async (res) => {
      if (!res.ok) {
        const parsed = await res.json().catch(() => null);
        const msg = parseFastApiDetail(parsed) || "Login failed.";
        throw new Error(msg);
      }
      return res.json() as Promise<AuthResponse>;
    });
  },

  loginWebAnalyst: async (email: string, password: string) => {
    return fetchWithHelp(`${BASE_URL}/auth/login-web-analyst`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    }).then(async (res) => {
      if (!res.ok) {
        const parsed = await res.json().catch(() => null);
        const msg = parseFastApiDetail(parsed) || "Login failed.";
        throw new Error(msg);
      }
      return res.json() as Promise<{
        access_token: string;
        web_analyst: WebAnalyst;
      }>;
    });
  },

  me: () => request<User>("/auth/me", {}, true),

  verify: () => request<void>("/auth/verify", { method: "POST" }, true),
};

// ── Cached /me helper ─────────────────────────────────────────────────────────

export const USER_CACHE_KEY = "reput_user";
export const PROFILE_CACHE_KEY = "reput_profile";
const SESSION_CACHE_TTL = 60_000;

export async function getCachedMe(): Promise<User> {
  try {
    const raw = sessionStorage.getItem(USER_CACHE_KEY);
    if (raw) {
      const { user, ts } = JSON.parse(raw) as { user: User; ts: number };
      if (Date.now() - ts < SESSION_CACHE_TTL) return user;
    }
  } catch {}
  const user = await auth.me();
  if (!user.is_active) {
    clearAuth();
    if (typeof window !== "undefined") {
      window.location.replace("/login?reason=session_expired");
    }
    throw new Error("Session expired.");
  }
  try {
    sessionStorage.setItem(
      USER_CACHE_KEY,
      JSON.stringify({ user, ts: Date.now() }),
    );
  } catch {}
  return user;
}

export async function getCachedProfile(): Promise<UserProfile | null> {
  try {
    const raw = sessionStorage.getItem(PROFILE_CACHE_KEY);
    if (raw) {
      const { profile, ts } = JSON.parse(raw) as {
        profile: UserProfile;
        ts: number;
      };
      if (Date.now() - ts < SESSION_CACHE_TTL) return profile;
    }
  } catch {}
  const profile = await users.getProfile().catch(() => null);
  try {
    if (profile)
      sessionStorage.setItem(
        PROFILE_CACHE_KEY,
        JSON.stringify({ profile, ts: Date.now() }),
      );
  } catch {}
  return profile;
}

// ── User / Profile endpoints ──────────────────────────────────────────────────

export const users = {
  list: () => request<User[]>("/users/", {}, true),

  updateMe: async (data: {
    name?: string;
    phone?: string;
    nationality?: string;
    date_of_birth?: string;
    scan_depth?: ScanDepth;
    profile_complete?: boolean;
  }) =>
    request<User>(
      "/users/me",
      { method: "PATCH", body: JSON.stringify(data) },
      true,
    ),

  getProfile: () => request<UserProfile>("/users/me/profile", {}, true),

  upsertProfile: (data: Partial<UserProfile>) =>
    request<UserProfile>(
      "/users/me/profile",
      { method: "PUT", body: JSON.stringify(data) },
      true,
    ),

  deleteMe: () => request<void>("/users/me", { method: "DELETE" }, true),

  startTrial: () =>
    request<User>("/users/me/start-trial", { method: "POST" }, true),
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
      true,
    ),

  updateScan: (
    scanId: string,
    data: Pick<ReputationScan, "score" | "risk_level" | "results" | "summary">,
  ) =>
    request<ReputationScan>(
      `/reputation/scan/${scanId}`,
      { method: "PATCH", body: JSON.stringify(data) },
      true,
    ),
};

// ── Quotes endpoints ──────────────────────────────────────────────────────────

export const quotes = {
  submit: (payload: QuotePayload) =>
    request<{ id: string }>(
      "/quotes/authenticated",
      { method: "POST", body: JSON.stringify(payload) },
      true,
    ),

  submitGuest: (payload: QuotePayload) =>
    request<{ id: string }>("/quotes", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getMyQuotes: () => request<unknown[]>("/quotes/my", {}, true),
};

// ── Meetings types & endpoints ───────────────────────────────────────────────

export interface MeetingAttendee {
  name: string;
  email: string;
}

export interface Meeting {
  id: string;
  user_id: string;
  cal_booking_uid: string;
  title: string;
  status: "upcoming" | "cancelled" | "completed";
  event_type: string | null;
  start_time: string;
  end_time: string;
  attendees: MeetingAttendee[];
  created_at: string;
}

export const meetings = {
  getMy: () => request<Meeting[]>("/meetings/my", {}, true),
};

// ── Feedback endpoints ────────────────────────────────────────────────────────

export interface FeedbackItem {
  id: string;
  email: string | null;
  message: string;
  created_at: string;
}

export const feedback = {
  submit: (message: string, email?: string) =>
    request<FeedbackItem>("/feedback", {
      method: "POST",
      body: JSON.stringify({ message, email }),
    }),

  list: () => request<FeedbackItem[]>("/feedback"),
};

// ── Contracts endpoints ───────────────────────────────────────────────────────

export const contracts = {
  create: (payload: { links: ContractLink[]; notes?: string }) =>
    request<Contract>(
      "/contracts",
      { method: "POST", body: JSON.stringify(payload) },
      true,
    ),

  getMy: () => request<Contract[]>("/contracts/my", {}, true),
};

// ── Dashboard types & endpoints ───────────────────────────────────────────────

export interface DashboardStats {
  web_analysts: number;
  scans: number;
  leads: number;
  contracts: number;
  clients: number;
}

export interface MonthPoint {
  month: string;
  count: number;
}

export interface DashboardCharts {
  web_analysts: MonthPoint[];
  leads: MonthPoint[];
  contracts: MonthPoint[];
  clients: MonthPoint[];
}

export interface WebAnalyst {
  id: string;
  name: string;
  email: string;
  role: "admin" | "analyst";
  is_blocked: boolean;
  created_at: string | null;
}

export const webAnalystsApi = {
  list: () => request<WebAnalyst[]>("/web-analysts/", {}, true),
  me: () => request<WebAnalyst>("/web-analysts/me", {}, true),
  updateMe: (data: { name: string }) =>
    request<{ ok: boolean }>(
      "/web-analysts/me",
      { method: "PATCH", body: JSON.stringify(data) },
      true,
    ),
  create: (data: { name: string; email: string; password: string; role: "admin" | "analyst" }) =>
    request<{ id: string }>("/web-analysts/", { method: "POST", body: JSON.stringify(data) }, true),
  delete: (id: string) =>
    request<void>(`/web-analysts/${id}`, { method: "DELETE" }, true),
  setBlocked: (id: string, blocked: boolean) =>
    request<{ ok: boolean; is_blocked: boolean }>(
      `/web-analysts/${id}/block`,
      { method: "PATCH", body: JSON.stringify({ blocked }) },
      true,
    ),
  changePassword: (data: { current_password: string; new_password: string }) =>
    request<{ ok: boolean }>("/web-analysts/me/password", { method: "PATCH", body: JSON.stringify(data) }, true),
  deleteMe: () =>
    request<void>("/web-analysts/me", { method: "DELETE" }, true),
};

export const dashboard = {
  stats: () => request<DashboardStats>("/dashboard/stats", {}, true),
  charts: () => request<DashboardCharts>("/dashboard/charts", {}, true),
};

// ── Leads types & endpoints ───────────────────────────────────────────────────

export interface LeadCreatePayload {
  name?: string;
  company?: string;
  country?: string;
  background?: string;
  pre_analysis_summary?: string;
  keywords_suggested?: string[];
  force_new?: boolean;
}

export interface LeadUpdatePayload {
  links?: unknown[];
  summary?: Record<string, unknown> | null;
  score?: number;
  keywords_suggested?: string[];
}

export interface WebLink {
  url: string;
  title: string;
  snippet: string;
  sentiment: "negative" | "positive" | "neutral";
  risk: "high" | "medium" | "low" | "none";
  source: string;
  type: string;
  date?: string;
  keyword?: string;   // legacy: old saved leads
  keywords?: string[]; // current: array of all matched keywords
  country?: string;
}

export interface FullLead {
  id: string;
  name: string | null;
  company: string | null;
  country: string | null;
  background: string | null;
  pre_analysis_summary: string | null;
  keywords_suggested: string[];
  links: WebLink[];
  summary: {
    headline: string;
    issues: string[];
    talkingPoints: string[];
  } | null;
  score: number | null;
  scanned_by_name: string | null;
  scanned_by_email: string | null;
  researched_at: string | null;
  scanned_at: string | null;
}

export interface RecentLead {
  id: string;
  name: string | null;
  company: string | null;
  country: string | null;
  background: string | null;
  score: number | null;
  scanned_by_name: string | null;
  scanned_by_email: string | null;
  scanned_by_role: string | null;
  assigned_to_name: string | null;
  researched_at: string | null;
  scanned_at: string | null;
}

export const leads = {
  create: (data: LeadCreatePayload) =>
    request<{ id: string }>(
      "/leads/",
      { method: "POST", body: JSON.stringify(data) },
      true,
    ),

  update: (id: string, data: LeadUpdatePayload) =>
    request<{ ok: boolean }>(
      `/leads/${id}`,
      { method: "PATCH", body: JSON.stringify(data) },
      true,
    ),

  list: (limit = 5) =>
    request<RecentLead[]>(`/leads/?limit=${limit}`, {}, true),

  get: (id: string) => request<FullLead>(`/leads/${id}`, {}, true),
};

// ── Clients types & endpoints ─────────────────────────────────────────────────

export type ClientEventType =
  | "research"
  | "scan"
  | "quote_sent"
  | "quote_accepted"
  | "quote_rejected"
  | "contract_created"
  | "meeting_set";

export interface ClientEvent {
  id: string;
  event_type: ClientEventType;
  data: Record<string, unknown> | null;
  created_at: string;
}

export interface ClientListItem {
  id: string;
  name: string;
  country: string;
  company: string | null;
  scanned_by_name: string | null;
  scanned_by_role: string | null;
  assigned_to_id: string | null;
  assigned_to_name: string | null;
  created_at: string;
  updated_at: string;
  latest_event_type: ClientEventType | null;
  latest_event_at: string | null;
  latest_score: number | null;
}

export interface ClientDetail {
  id: string;
  name: string;
  country: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  researched_by_name: string | null;
  researched_by_role: string | null;
  scanned_by_name: string | null;
  scanned_by_role: string | null;
  assigned_to_id: string | null;
  assigned_to_name: string | null;
  created_at: string;
  updated_at: string;
  events: ClientEvent[];
}

export interface ClientUpsertPayload {
  name: string;
  country: string;
  company?: string;
  email?: string;
  phone?: string;
  event_type?: ClientEventType;
  event_data?: Record<string, unknown>;
}

export interface ClientAddEventPayload {
  event_type: ClientEventType;
  event_data?: Record<string, unknown>;
}

export const clientsApi = {
  upsert: (data: ClientUpsertPayload) =>
    request<{ id: string; created: boolean }>(
      "/clients/upsert",
      { method: "POST", body: JSON.stringify(data) },
      true,
    ),

  addEvent: (clientId: string, data: ClientAddEventPayload) =>
    request<{ event_id: string }>(
      `/clients/${clientId}/events`,
      { method: "POST", body: JSON.stringify(data) },
      true,
    ),

  list: (limit = 100, offset = 0) =>
    request<ClientListItem[]>(
      `/clients/?limit=${limit}&offset=${offset}`,
      {},
      true,
    ),

  get: (id: string) => request<ClientDetail>(`/clients/${id}`, {}, true),

  delete: (id: string) =>
    request<{ ok: boolean }>(`/clients/${id}`, { method: "DELETE" }, true),

  assign: (clientId: string, analystId: string | null) =>
    request<{ ok: boolean; assigned_to: string | null }>(
      `/clients/${clientId}/assign`,
      { method: "PATCH", body: JSON.stringify({ analyst_id: analystId }) },
      true,
    ),
};

// ── Web Analysts ──────────────────────────────────────────────────────────────

export interface WebAnalystItem {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
}

export const webAnalysts = {
  list: () => request<WebAnalystItem[]>("/web-analysts/", {}, true),
};
