const BASE_URL = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api/v1/news`
  : 'http://localhost:8000/api/v1/news';

function getCookieToken(): string | null {
  try {
    const match = document.cookie.match(/(?:^|;\s*)reput_token=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  try {
    const fromStorage = localStorage.getItem('reput_token');
    if (fromStorage) return fromStorage;

    // Proxy sets the token as a cookie on first visit — sync it into localStorage
    const fromCookie = getCookieToken();
    if (fromCookie) {
      localStorage.setItem('reput_token', fromCookie);
      return fromCookie;
    }

    return null;
  } catch {
    return getCookieToken();
  }
}

function authHeaders(): HeadersInit {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...options.headers,
    },
  });
}

export async function apiPost<T = unknown>(path: string, body: unknown): Promise<T> {
  const res = await apiFetch(path, { method: 'POST', body: JSON.stringify(body) });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string; error?: string }).detail || (err as { detail?: string; error?: string }).error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export async function apiGet<T = unknown>(path: string): Promise<T> {
  const res = await apiFetch(path, { method: 'GET' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail || `Request failed: ${res.status}`);
  }
  return res.json();
}

export async function apiPut<T = unknown>(path: string, body: unknown): Promise<T> {
  const res = await apiFetch(path, { method: 'PUT', body: JSON.stringify(body) });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail || `Request failed: ${res.status}`);
  }
  return res.json();
}

export async function apiDelete(path: string): Promise<void> {
  const res = await apiFetch(path, { method: 'DELETE' });
  if (!res.ok && res.status !== 204) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail || `Request failed: ${res.status}`);
  }
}

// ── Draft field converters (snake_case DB ↔ camelCase AIDraft) ───────────────

export function dbDraftToAIDraft(d: Record<string, any>) {
  return {
    id: d.id,
    originalSource: d.original_source,
    originalUrl: d.original_url,
    originalTitle: d.original_title,
    originalExcerpt: d.original_excerpt || '',
    originalPublishedAt: d.original_published_at || '',
    generatedKicker: d.generated_kicker || '',
    generatedTitle: d.generated_title || '',
    generatedSubtitle: d.generated_subtitle || '',
    generatedBodyPreview: d.generated_body_preview || '',
    generatedBody: d.generated_body || '',
    generatedSeoTitle: d.generated_seo_title || '',
    generatedMetaDescription: d.generated_meta_description || '',
    generatedSlug: d.generated_slug || '',
    generatedTags: d.generated_tags || [],
    generatedCategory: d.generated_category || '',
    generatedCity: d.generated_city || '',
    coverImageUrl: d.cover_image_url || '',
    coverImageStatus: d.cover_image_status || 'Not selected',
    coverImageSource: d.cover_image_source || 'Unsplash',
    coverImageLicense: d.cover_image_license || '',
    coverImageAttribution: d.cover_image_attribution || '',
    imageSearchQuery: d.image_search_query || '',
    imageAltText: d.image_alt_text || '',
    imageCaption: d.image_caption || '',
    alternativeImages: d.alternative_images || [],
    priorityScore: d.priority_score || 0,
    priorityReasons: d.priority_reasons || [],
    status: d.status || 'AI Draft',
    isBreaking: d.is_breaking || false,
  };
}

export function aiDraftToDb(draft: Record<string, any>) {
  return {
    original_source: draft.originalSource,
    original_url: draft.originalUrl,
    original_title: draft.originalTitle,
    original_excerpt: draft.originalExcerpt,
    original_published_at: draft.originalPublishedAt,
    generated_kicker: draft.generatedKicker,
    generated_title: draft.generatedTitle,
    generated_subtitle: draft.generatedSubtitle,
    generated_body_preview: draft.generatedBodyPreview,
    generated_body: draft.generatedBody,
    generated_seo_title: draft.generatedSeoTitle,
    generated_meta_description: draft.generatedMetaDescription,
    generated_slug: draft.generatedSlug,
    generated_tags: draft.generatedTags,
    generated_category: draft.generatedCategory,
    generated_city: draft.generatedCity,
    cover_image_url: draft.coverImageUrl,
    cover_image_status: draft.coverImageStatus,
    cover_image_source: draft.coverImageSource,
    cover_image_license: draft.coverImageLicense,
    cover_image_attribution: draft.coverImageAttribution,
    image_search_query: draft.imageSearchQuery,
    image_alt_text: draft.imageAltText,
    image_caption: draft.imageCaption,
    alternative_images: draft.alternativeImages,
    priority_score: draft.priorityScore,
    priority_reasons: draft.priorityReasons,
    status: draft.status,
    is_breaking: draft.isBreaking,
  };
}
