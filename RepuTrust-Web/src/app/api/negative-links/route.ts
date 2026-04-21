import { COUNTRY_NAME_TO_ISO } from "@/lib/countries";
import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

export interface WebLink {
  url: string;
  title: string;
  snippet: string;
  sentiment: "negative" | "positive" | "neutral";
  risk: "high" | "medium" | "low" | "none";
  source: string;
  type: string;
}

interface SerperResult {
  title: string;
  link: string;
  snippet: string;
  position: number;
}

interface SerperResponse {
  organic: SerperResult[];
}

interface FirecrawlResponse {
  success: boolean;
  data?: {
    markdown?: string;
    metadata?: { title?: string; description?: string };
  };
}

interface ArticleForClassification {
  url: string;
  title: string;
  snippet: string;
  content: string;
}

/** Legacy demonyms and shorthand from the old nationality dropdown (still stored in profiles). */
const NATIONALITY_ALIASES: Record<string, string> = {
  afghan: "AF",
  albanian: "AL",
  algerian: "DZ",
  american: "US",
  argentine: "AR",
  australian: "AU",
  austrian: "AT",
  belgian: "BE",
  brazilian: "BR",
  british: "GB",
  bulgarian: "BG",
  canadian: "CA",
  chilean: "CL",
  chinese: "CN",
  colombian: "CO",
  croatian: "HR",
  czech: "CZ",
  danish: "DK",
  dutch: "NL",
  egyptian: "EG",
  emirati: "AE",
  finnish: "FI",
  french: "FR",
  german: "DE",
  greek: "GR",
  hungarian: "HU",
  indian: "IN",
  indonesian: "ID",
  iranian: "IR",
  iraqi: "IQ",
  irish: "IE",
  israeli: "IL",
  italian: "IT",
  japanese: "JP",
  jordanian: "JO",
  kenyan: "KE",
  korean: "KR",
  lebanese: "LB",
  malaysian: "MY",
  mexican: "MX",
  moroccan: "MA",
  "new zealander": "NZ",
  nigerian: "NG",
  norwegian: "NO",
  pakistani: "PK",
  peruvian: "PE",
  philippine: "PH",
  polish: "PL",
  portuguese: "PT",
  romanian: "RO",
  russian: "RU",
  saudi: "SA",
  serbian: "RS",
  singaporean: "SG",
  "south african": "ZA",
  spanish: "ES",
  swedish: "SE",
  swiss: "CH",
  thai: "TH",
  turkish: "TR",
  ukranian: "UA",
  ukrainian: "UA",
  venezuelan: "VE",
  vietnamese: "VN",
  netherlands: "NL",
  "czech republic": "CZ",
  uae: "AE",
  uk: "GB",
  "united kingdom": "GB",
  usa: "US",
  "united states": "US",
  "south korea": "KR",
  turkiye: "TR",
  turkey: "TR",
  taiwan: "TW",
  vietnam: "VN",
  philippines: "PH",
  iran: "IR",
  russia: "RU",
  syria: "SY",
  venezuela: "VE",
  bolivia: "BO",
  moldova: "MD",
  tanzania: "TZ",
  laos: "LA",
  "north korea": "KP",
  micronesia: "FM",
  palestine: "PS",
  ethiopia: "ET",
  ghana: "GH",
  senegal: "SN",
};

function countryCodeFromNationality(nationality: string): string | null {
  const k = nationality.toLowerCase().trim();
  return COUNTRY_NAME_TO_ISO[k] ?? NATIONALITY_ALIASES[k] ?? null;
}

function dedupeLinks(all: WebLink[]): WebLink[] {
  const map = new Map<string, WebLink>();

  const sentimentPriority = { negative: 3, neutral: 2, positive: 1 };
  const riskPriority = { high: 4, medium: 3, low: 2, none: 1 };

  for (const link of all) {
    const existing = map.get(link.url);
    if (!existing) {
      map.set(link.url, link);
      continue;
    }
    const existingScore =
      sentimentPriority[existing.sentiment] * 10 + riskPriority[existing.risk];
    const newScore =
      sentimentPriority[link.sentiment] * 10 + riskPriority[link.risk];
    if (newScore > existingScore) {
      map.set(link.url, link);
    }
  }

  return Array.from(map.values());
}

// Maps ISO 3166-1 alpha-2 country codes to their primary language codes for Serper hl param.
const COUNTRY_TO_LANGUAGE: Record<string, string> = {
  IT: "it", FR: "fr", DE: "de", ES: "es", PT: "pt", NL: "nl",
  PL: "pl", RO: "ro", HU: "hu", CZ: "cz", SK: "sk", HR: "hr",
  RU: "ru", UA: "ua", TR: "tr", AR: "ar", JP: "ja", KR: "ko",
  CN: "zh-CN", TW: "zh-TW", SA: "ar", AE: "ar", EG: "ar",
  IN: "hi", TH: "th", VN: "vi", ID: "id", MY: "ms",
  GR: "el", SV: "sv", NO: "no", FI: "fi", DK: "da",
};


async function searchSerper(
  query: string,
  countryCode: string | null,
  numResults = 20,
): Promise<SerperResult[]> {
  const serperKey = process.env.SERPER_API_KEY;
  if (!serperKey) throw new Error("SERPER_API_KEY not configured");

  const payload: Record<string, unknown> = { q: query, num: numResults };
  if (countryCode) {
    payload.gl = countryCode.toLowerCase();
    const lang = COUNTRY_TO_LANGUAGE[countryCode.toUpperCase()];
    if (lang) payload.hl = lang;
  }

  const res = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": serperKey,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    console.error(`Serper error: ${res.status} ${await res.text()}`);
    return [];
  }

  const data = (await res.json()) as SerperResponse;
  return data.organic ?? [];
}

async function scrapeWithFirecrawl(url: string): Promise<string | null> {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) return null;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);

    const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ url, formats: ["markdown"] }),
      signal: controller.signal,
    });

    clearTimeout(timer);
    if (!res.ok) return null;

    const data = (await res.json()) as FirecrawlResponse;
    if (!data.success || !data.data?.markdown) return null;

    return data.data.markdown.slice(0, 600);
  } catch {
    return null;
  }
}

async function classifyWithClaude(
  client: Anthropic,
  articles: ArticleForClassification[],
  name: string,
  nationality: string | null,
): Promise<WebLink[]> {
  if (articles.length === 0) return [];

  const articleList = articles
    .map(
      (a, i) =>
        `[${i + 1}] URL: ${a.url}
Title: ${a.title}
Snippet: ${a.snippet}
Content: ${a.content}`,
    )
    .join("\n\n---\n\n");

  const nationalityLine = nationality
    ? `The subject is from ${nationality}. Only include results clearly relevant to this person and their region.`
    : "";

  const prompt = `You are a reputation intelligence analyst. Classify the following ${articles.length} articles about "${name}".

${nationalityLine}

CLASSIFICATION RULES:

NEGATIVE sentiment — classify if the article contains ANY of:
- Criminal investigations, police involvement, charges, arrests
- Lawsuits, legal disputes, court cases, regulatory sanctions
- Fraud, scams, financial misconduct
- Accusations, allegations, or suspicion of wrongdoing
- Controversies, scandals, or reputation-damaging incidents
- Accidents or incidents involving the subject
- WHEN IN DOUBT between negative and neutral → choose NEGATIVE

POSITIVE sentiment — classify if the article CLEARLY shows:
- Awards, honors, recognitions
- Major achievements or business/professional success
- Leadership appointments or promotions
- Strong positive media coverage praising the person

NEUTRAL sentiment — ONLY if:
- Purely informational (Wikipedia entry, directory listing, company profile)
- ZERO reputational concern whatsoever
- No legal mentions, no incidents, no controversy

RISK CLASSIFICATION:
- "high": crimes, fraud, lawsuits, investigations, illegal activity
- "medium": accidents, controversies, allegations, complaints
- "low": minor criticism or weak negative mentions
- "none": positive or neutral content

MANDATORY NAME FILTER: Every result MUST explicitly mention "${name}" by name in the title, snippet, or content.
If "${name}" does not appear → set sentiment to "neutral" and risk to "none".

ARTICLES TO CLASSIFY:
${articleList}

Return a JSON array only — no explanation, no markdown code fences. Each element must have:
{
  "url": "...",
  "title": "...",
  "snippet": "...",
  "sentiment": "negative" | "positive" | "neutral",
  "risk": "high" | "medium" | "low" | "none",
  "source": "domain.com",
  "type": "criminal" | "legal" | "news" | "complaint" | "regulatory" | "social" | "award" | "achievement" | "profile" | "wiki" | "directory"
}

Return ONLY the JSON array. If no valid articles, return [].`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8192,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") return [];

  const raw = textBlock.text.trim();
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  try {
    return JSON.parse(jsonMatch[0]) as WebLink[];
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 500 },
    );
  }

  const { name, keywords, nationality } = (await req.json()) as {
    name: string;
    keywords: string[];
    nationality?: string;
  };

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });
  const countryCode = nationality
    ? countryCodeFromNationality(nationality)
    : null;

  try {
    // ── Phase 1: Parallel Serper searches ─────────────────────────────────────
    // One search per keyword with exact full-name match; fallback if no keywords
    const searchQueries = (keywords ?? []).length > 0
      ? (keywords ?? []).map((kw) => `"${name}" ${kw}`)
      : [`"${name}"`];

    const allResults = await Promise.all(
      searchQueries.map((q) => searchSerper(q, countryCode)),
    );

    // ── Phase 2: Deduplicate URLs, scrape with Firecrawl in parallel ──────────
    const seenUrls = new Set<string>();
    const articles: ArticleForClassification[] = [];

    for (const results of allResults) {
      for (const r of results) {
        if (!seenUrls.has(r.link)) {
          seenUrls.add(r.link);
          articles.push({
            url: r.link,
            title: r.title,
            snippet: r.snippet,
            content: r.snippet,
          });
        }
      }
    }

    // Cap Firecrawl at 25 articles to limit API usage; rest still get classified via snippet
    const articlesToScrape = articles.slice(0, 25);
    const scrapeResults = await Promise.allSettled(
      articlesToScrape.map((a) => scrapeWithFirecrawl(a.url)),
    );

    scrapeResults.forEach((result, i) => {
      if (result.status === "fulfilled" && result.value) {
        articlesToScrape[i].content = result.value;
      }
    });

    // ── Phase 3: Single Claude classification call ────────────────────────────
    const classified = await classifyWithClaude(
      client,
      articles,
      name,
      nationality ?? null,
    );

    const deduped = dedupeLinks(classified);
    const negative = deduped.filter((l) => l.sentiment === "negative");
    const positive = deduped.filter((l) => l.sentiment === "positive");
    const neutral = deduped.filter((l) => l.sentiment === "neutral");

    return NextResponse.json({ links: deduped, negative, positive, neutral });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
