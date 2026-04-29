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
  IT: "it",
  FR: "fr",
  DE: "de",
  ES: "es",
  PT: "pt",
  NL: "nl",
  PL: "pl",
  RO: "ro",
  HU: "hu",
  CZ: "cs",
  SK: "sk",
  HR: "hr",
  RU: "ru",
  UA: "uk",
  TR: "tr",
  AR: "es",
  JP: "ja",
  KR: "ko",
  CN: "zh-CN",
  TW: "zh-TW",
  SA: "ar",
  AE: "ar",
  EG: "ar",
  IN: "hi",
  TH: "th",
  VN: "vi",
  ID: "id",
  MY: "ms",
  GR: "el",
  SE: "sv",
  NO: "no",
  FI: "fi",
  DK: "da",
  GB: "en",
  US: "en",
  CA: "en",
  AU: "en",
  IE: "en",
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
    const body = await res.text();
    console.error(`Serper error: ${res.status} ${body}`);
    throw new Error(`Search service error (${res.status}): ${body}`);
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
      body: JSON.stringify({
        url,
        formats: ["markdown"],
        parsers: [],
        onlyMainContent: true,
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);
    if (!res.ok) return null;

    const data = (await res.json()) as FirecrawlResponse;
    if (!data.success || !data.data?.markdown) return null;

    return data.data.markdown.slice(0, 4000);
  } catch (err) {
    console.error(
      `[firecrawl] Failed to scrape ${url}:`,
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

async function classifyWithClaude(
  client: Anthropic,
  articles: ArticleForClassification[],
  name: string,
  nationality: string | null,
  keywords: string[],
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

  const lastName = name.split(" ").pop() ?? name;
  const firstName = name.split(" ").shift() ?? name;

  const nationalityLine = nationality
    ? `The subject is from ${nationality}. Only include results clearly relevant to this person and their region.`
    : "";

  const keywordList =
    keywords.length > 0 ? keywords.join(", ") : "general reputation";

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

MANDATORY NAME FILTER:
Before classifying, check whether the subject "${name}" is clearly identifiable in the title, snippet, or content.

INCLUDE the article if:
•⁠  The full name "${name}" appears (case-insensitive), OR
•⁠  Both "${firstName}" AND "${lastName}" appear in close proximity (within the same sentence or paragraph)

EXCLUDE the article if:
•⁠  Only the first name appears without the last name, OR
•⁠  Only the last name appears without the first name, OR
•⁠  Neither appears at all

If EXCLUDED → do not include this article in the output array at all. Return nothing for it.

ARTICLES TO CLASSIFY:
${articleList}

Return a JSON array only — no explanation, no markdown code fences. Each element must have:
{
  "url": "...",
  "title": "...",
  "snippet": "3 sentence explanation of the reputational significance of this article, written in your own words based on the title and content — not copied from the source. Write the snippet in the same language as the article (e.g. Italian if the article is in Italian, English if in English).",
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

  if (response.stop_reason === "max_tokens") {
    console.warn(
      "[classify] Claude hit max_tokens — JSON may be truncated, returning partial or empty results",
    );
  }

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

function deriveScoreServer(negCount: number, posCount: number): number {
  if (negCount === 0) {
    if (posCount >= 10) return 100;
    return 86 + Math.round((posCount / 9) * 13);
  }
  if (negCount <= 5) {
    const base = 85 - (negCount - 1) * 4;
    return Math.min(
      85,
      Math.max(61, base + Math.round((Math.min(posCount, 10) / 10) * 5)),
    );
  }
  if (negCount <= 10) {
    const base = 60 - (negCount - 6) * 7;
    return Math.min(
      60,
      Math.max(26, base + Math.round((Math.min(posCount, 10) / 10) * 5)),
    );
  }
  return Math.max(0, 25 - (negCount - 11) * 2);
}

function fallbackSummary(score: number) {
  return {
    headline:
      score >= 86
        ? "Clean profile — low urgency"
        : score >= 61
          ? "Some concerns — moderate priority"
          : "Significant issues — high priority",
    issues: ["Summary unavailable"],
    talkingPoints: [
      "Discuss their current online presence",
      "Highlight risks of unmanaged reputation",
    ],
  };
}

async function generateMeetingSummary(
  client: Anthropic,
  name: string,
  score: number,
  links: WebLink[],
): Promise<{ headline: string; issues: string[]; talkingPoints: string[] }> {
  const negLinks = links.filter(
    (l) =>
      l.sentiment === "negative" || l.risk === "high" || l.risk === "medium",
  );
  const posLinks = links.filter((l) => l.sentiment === "positive");
  const findingsSummary = [
    negLinks.length > 0
      ? `Negative:\n${negLinks
          .slice(0, 6)
          .map((l) => `- ${l.title} (${l.source}, risk: ${l.risk})`)
          .join("\n")}`
      : "No negative results found.",
    posLinks.length > 0
      ? `Positive:\n${posLinks
          .slice(0, 4)
          .map((l) => `- ${l.title} (${l.source})`)
          .join("\n")}`
      : "No positive results found.",
  ].join("\n\n");

  const prompt = `You are an analyst at a reputation management firm. A scan for "${name}" returned a ReputScore of ${score}/100.

Findings:
${findingsSummary}

Return a JSON object (no markdown, no explanation) with:
{
  "headline": "one-line assessment for the sales team",
  "issues": ["up to 4 key points about their reputation (positive or negative), or 1 entry if nothing found"],
  "talkingPoints": ["2-3 suggested opening lines for a client meeting focused on why they need reputation management"]
}`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 512,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") return fallbackSummary(score);
  try {
    const json = JSON.parse(
      textBlock.text.trim().match(/\{[\s\S]*\}/)?.[0] ?? "",
    );
    return json;
  } catch {
    return fallbackSummary(score);
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

  const { name, keywords, nationality, resultsCap, includeSummary } =
    (await req.json()) as {
      name: string;
      keywords: string[];
      nationality?: string;
      resultsCap?: number;
      includeSummary?: boolean;
    };

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const sanitizedName = name
    .trim()
    .slice(0, 200)
    .replace(/[\r\n]/g, " ");

  const client = new Anthropic({ apiKey });
  const countryCode = nationality
    ? countryCodeFromNationality(nationality)
    : null;

  try {
    // ── Phase 1: Parallel Serper searches ─────────────────────────────────────
    // One search per keyword with exact full-name match; fallback if no keywords
    const normalizedKeywords = keywords ?? [];
    const searchQueries =
      normalizedKeywords.length > 0
        ? normalizedKeywords.map((kw) => `"${sanitizedName}" ${kw}`)
        : [`"${sanitizedName}"`];

    const cap = resultsCap ?? 20;

    const allResults = await Promise.all(
      searchQueries.map((q) => searchSerper(q, countryCode, cap)),
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

    const cappedArticles = articles.slice(0, cap);
    const scrapeResults = await Promise.allSettled(
      cappedArticles.map((a) => scrapeWithFirecrawl(a.url)),
    );

    scrapeResults.forEach((result, i) => {
      if (result.status === "fulfilled" && result.value) {
        cappedArticles[i].content = result.value;
      }
    });

    // ── Pre-filter: drop articles that don't mention the name + at least one keyword ──
    const fullNameLower = sanitizedName.toLowerCase();
    const keywordTerms = normalizedKeywords.map((k) => k.toLowerCase());

    const nameMatchedArticles = cappedArticles.filter((a) => {
      const haystack = `${a.title} ${a.snippet} ${a.content}`.toLowerCase();
      const hasName = haystack.includes(fullNameLower);
      const hasKeyword =
        keywordTerms.length === 0 ||
        keywordTerms.some((k) => haystack.includes(k));
      return hasName && hasKeyword;
    });

    // ── Phase 3: Single Claude classification call ────────────────────────────
    const classified = await classifyWithClaude(
      client,
      nameMatchedArticles,
      sanitizedName,
      nationality ?? null,
      normalizedKeywords,
    );

    const deduped = dedupeLinks(classified).slice(0, cap);
    const negative = deduped.filter((l) => l.sentiment === "negative");
    const positive = deduped.filter((l) => l.sentiment === "positive");
    const neutral = deduped.filter((l) => l.sentiment === "neutral");

    const negCount = negative.length;
    const posCount = positive.length;
    const summary = includeSummary
      ? await generateMeetingSummary(
          client,
          sanitizedName,
          deriveScoreServer(negCount, posCount),
          deduped,
        )
      : undefined;

    return NextResponse.json({
      links: deduped,
      negative,
      positive,
      neutral,
      ...(summary ? { summary } : {}),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
