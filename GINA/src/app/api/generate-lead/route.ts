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
  date?: string;
}

interface SerperResult {
  title: string;
  link: string;
  snippet: string;
  position: number;
  date?: string;
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

const LANGUAGE_NAME_TO_CODE: Record<string, string> = {
  English: "en",
  Arabic: "ar",
  Chinese: "zh-CN",
  Czech: "cs",
  Danish: "da",
  Dutch: "nl",
  Finnish: "fi",
  French: "fr",
  German: "de",
  Greek: "el",
  Hebrew: "iw",
  Hindi: "hi",
  Hungarian: "hu",
  Indonesian: "id",
  Italian: "it",
  Japanese: "ja",
  Korean: "ko",
  Malay: "ms",
  Norwegian: "no",
  Polish: "pl",
  Portuguese: "pt",
  Romanian: "ro",
  Russian: "ru",
  Spanish: "es",
  Swedish: "sv",
  Thai: "th",
  Turkish: "tr",
  Ukrainian: "uk",
  Vietnamese: "vi",
};

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

const MONTH_MAP: Record<string, number> = {
  // English
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
  // Italian
  gen: 1,
  mag: 5,
  giu: 6,
  lug: 7,
  ago: 8,
  set: 9,
  ott: 10,
  dic: 12,
  // Spanish
  ene: 1,
  abr: 4,
  ago_es: 8, // ago already covered
  // French
  fév: 2,
  avr: 4,
  aoû: 8,
  // German
  mär: 3,
  okt: 10,
  // Portuguese
  fev: 2,
  out: 10,
};

function parseSerperDate(dateStr: string): number {
  // Try native parse first (works for ISO / English formats)
  const native = Date.parse(dateStr);
  if (!isNaN(native)) return native;

  // Try "DD MMM YYYY" or "D MMM YYYY" in any supported locale
  const m = dateStr
    .trim()
    .match(/^(\d{1,2})\s+([a-záàâäéèêëíìîïóòôöúùûüñç]+)\.?\s+(\d{4})$/i);
  if (m) {
    const month = MONTH_MAP[m[2].toLowerCase()];
    if (month) return new Date(Number(m[3]), month - 1, Number(m[1])).getTime();
  }

  return NaN;
}

function countryCodeFromName(country: string): string | null {
  const k = country.toLowerCase().trim();
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
    if (newScore > existingScore) map.set(link.url, link);
  }

  return Array.from(map.values());
}

async function searchSerper(
  query: string,
  countryCode: string | null,
  languageCode: string | null,
  numPages = 2,
): Promise<{ organic: SerperResult[]; raw: SerperResponse[] }> {
  const serperKey = process.env.SERPER_API_KEY;
  if (!serperKey) throw new Error("SERPER_API_KEY not configured");

  const makePayload = (page: number) => {
    const payload: Record<string, unknown> = { q: query, page };
    if (countryCode) payload.gl = countryCode.toLowerCase();
    const lang =
      languageCode ??
      (countryCode ? COUNTRY_TO_LANGUAGE[countryCode.toUpperCase()] : null);
    if (lang) payload.hl = lang;
    return payload;
  };

  const raw = await Promise.all(
    Array.from({ length: numPages }, (_, i) =>
      fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-KEY": serperKey },
        body: JSON.stringify(makePayload(i + 1)),
      }).then((res) => {
        if (!res.ok) throw new Error(`Search service error (${res.status})`);
        return res.json() as Promise<SerperResponse>;
      }),
    ),
  );

  const organic = raw.flatMap((r) => r.organic ?? []);
  return { organic, raw };
}

async function isPdf(url: string): Promise<boolean> {
  const path = url.toLowerCase().split("?")[0];
  if (path.includes(".pdf")) return true;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(url, { method: "GET", signal: controller.signal });
    clearTimeout(timer);
    const contentType = res.headers.get("content-type") ?? "";
    const contentDisposition = res.headers.get("content-disposition") ?? "";
    controller.abort();
    return (
      contentType.includes("application/pdf") ||
      contentDisposition.toLowerCase().includes(".pdf")
    );
  } catch {
    return false;
  }
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
        onlyMainContent: true,
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = (await res.json()) as FirecrawlResponse;
    if (!data.success || !data.data?.markdown) return null;
    return data.data.markdown.slice(0, 8000);
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
  countries: string[],
  keywords: string[],
  subjectType: "individual" | "company" = "individual",
  languageName = "English",
  scanFocus?: string,
): Promise<WebLink[]> {
  if (articles.length === 0) return [];

  const articleList = articles
    .map(
      (a, i) =>
        `[${i + 1}] URL: ${a.url}\nTitle: ${a.title}\nSnippet: ${a.snippet}\nContent: ${a.content}`,
    )
    .join("\n\n---\n\n");

  const nameParts = name.split(" ").filter(Boolean);
  const firstName = nameParts[0] ?? name;
  const lastName = nameParts.slice(1).join(" ");

  const countriesLabel = countries.join(", ");
  const countryLine = countries.length > 0
    ? subjectType === "company"
      ? `The subject is a company from ${countriesLabel}. Only include results clearly relevant to this company and these regions.`
      : `The subject is from ${countriesLabel}. Only include results clearly relevant to this person and these regions.`
    : "";

  const keywordList =
    keywords.length > 0 ? keywords.join(", ") : "general reputation";

  const nameFilter = subjectType === "company"
    ? `MANDATORY NAME FILTER:
Before classifying, check whether the company "${name}" is clearly identifiable in the title, snippet, or content.

INCLUDE the article if:
• The company name "${name}" appears (case-insensitive)

EXCLUDE the article if:
• The article clearly refers to a different company with a similar name, OR
• The company name does not appear at all

If EXCLUDED → do not include this article in the output array at all.`
    : `MANDATORY NAME FILTER:
Before classifying, check whether the subject "${name}" is clearly identifiable in the title, snippet, or content.

INCLUDE the article if:
• The full name "${name}" appears (case-insensitive), OR
• Both "${firstName}" AND "${lastName}" appear in close proximity (within the same sentence or paragraph)

EXCLUDE the article if:
• Only the first name appears without the last name, OR
• Only the last name appears without the first name, OR
• The article is clearly about a different person with a similar name OR
• Neither appears at all

If EXCLUDED → do not include this article in the output array at all.`;

  const scanFocusRule =
    scanFocus && scanFocus !== "all"
      ? {
          negative: `\nSCAN FOCUS: Return ONLY articles with NEGATIVE sentiment or HIGH/MEDIUM risk. Exclude all positive and neutral articles from the output entirely.\n`,
          positive: `\nSCAN FOCUS: Return ONLY articles with POSITIVE sentiment. Exclude all negative and neutral articles from the output entirely.\n`,
          neutral: `\nSCAN FOCUS: Return ONLY articles with NEUTRAL sentiment (purely informational). Exclude all negative and positive articles from the output entirely.\n`,
        }[scanFocus] ?? ""
      : "";

  const prompt = `You are a reputation intelligence analyst. Classify the following ${articles.length} articles about "${name}".

${countryLine}
Search context keywords used: ${keywordList}
${scanFocusRule}
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

${nameFilter}

ARTICLES TO CLASSIFY:
${articleList}

Return a JSON array only — no explanation, no markdown code fences. Each element must have:
{
  "url": "...",
  "title": "...",
  "snippet": "3 sentence explanation of the reputational significance of this article, written in your own words based on the title and content — not copied from the source. Write the snippet in ${languageName}.",
  "sentiment": "negative" | "positive" | "neutral",
  "risk": "high" | "medium" | "low" | "none",
  "source": "domain.com",
  "type": "criminal" | "legal" | "news" | "complaint" | "regulatory" | "social" | "award" | "achievement" | "profile" | "wiki" | "directory"
}

Return ONLY the JSON array. If no valid articles, return [].`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 16000,
    messages: [{ role: "user", content: prompt }],
  });

  if (response.stop_reason === "max_tokens") {
    console.warn("[classify] Claude hit max_tokens — JSON may be truncated");
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
  languageName = "English",
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
}

Write all output (headline, issues, talkingPoints) in ${languageName}.`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 512,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") return fallbackSummary(score);
  try {
    return JSON.parse(textBlock.text.trim().match(/\{[\s\S]*\}/)?.[0] ?? "");
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

  const { firstName, lastName, company, country: countrySingle, countries: countriesRaw, keywords, pagesCap, subjectType = "individual", reportLanguage, useKeywords = true, scanFocus } =
    (await req.json()) as {
      firstName?: string;
      lastName?: string;
      company?: string;
      country?: string;
      countries?: string[];
      keywords: string[];
      pagesCap?: number;
      subjectType?: "individual" | "company";
      reportLanguage?: string;
      useKeywords?: boolean;
      scanFocus?: "negative" | "positive" | "neutral";
    };

  // Normalize to array — accept both legacy `country` string and new `countries` array
  const countries: string[] = Array.isArray(countriesRaw) && countriesRaw.length > 0
    ? countriesRaw
    : countrySingle ? [countrySingle] : [];

  if (!countries.length || (useKeywords && !keywords?.length)) {
    return NextResponse.json(
      { error: "Required fields missing" },
      { status: 400 },
    );
  }

  const searchSubject = subjectType === "company" && company
    ? company.trim()
    : `${(firstName ?? "").trim()} ${(lastName ?? "").trim()}`.trim();
  const sanitizedSubject = searchSubject.slice(0, 200).replace(/[\r\n]/g, " ");

  const client = new Anthropic({ apiKey });
  // Use first country for language/region detection
  const primaryCountry = countries[0] ?? "";
  const countryCode = countryCodeFromName(primaryCountry);
  const languageCode = countryCode
    ? (COUNTRY_TO_LANGUAGE[countryCode.toUpperCase()] ?? null)
    : null;

  const REPORT_LANG_MAP: Record<string, string> = { en: "English", it: "Italian", es: "Spanish" };
  const LANG_CODE_TO_NAME: Record<string, string> = {
    en: "English", it: "Italian", es: "Spanish", fr: "French", de: "German",
    pt: "Portuguese", nl: "Dutch", pl: "Polish", ro: "Romanian", hu: "Hungarian",
    cs: "Czech", ru: "Russian", uk: "Ukrainian", tr: "Turkish", ja: "Japanese",
    ko: "Korean", "zh-CN": "Chinese", ar: "Arabic", hi: "Hindi", th: "Thai",
    vi: "Vietnamese", id: "Indonesian", ms: "Malay", el: "Greek",
    sv: "Swedish", no: "Norwegian", fi: "Finnish", da: "Danish",
  };
  const outputLanguageName = reportLanguage
    ? (REPORT_LANG_MAP[reportLanguage] ?? "English")
    : (languageCode ? (LANG_CODE_TO_NAME[languageCode] ?? "English") : "English");

  try {
    // ── Phase 1: Parallel Serper searches ─────────────────────────────────────
    const FOCUS_QUERY_SUFFIX: Record<string, string> = {
      negative: "scandal fraud lawsuit complaint allegations",
      positive: "award recognition achievement success",
    };
    const focusSuffix = scanFocus ? (FOCUS_QUERY_SUFFIX[scanFocus] ?? "") : "";
    const searchQueries = useKeywords
      ? keywords.map((kw: string) => `${sanitizedSubject} ${kw}`)
      : [focusSuffix ? `${sanitizedSubject} ${focusSuffix}` : sanitizedSubject];

    const countryConfigs = countries.map((c) => {
      const code = countryCodeFromName(c);
      return {
        countryCode: code,
        languageCode: code ? (COUNTRY_TO_LANGUAGE[code.toUpperCase()] ?? null) : null,
      };
    });

    const serperResults = await Promise.all(
      searchQueries.flatMap((q) =>
        countryConfigs.map(({ countryCode: cc, languageCode: lc }) =>
          searchSerper(q, cc, lc, pagesCap ?? 2),
        ),
      ),
    );
    const allResults = serperResults.map((s) => s.organic);

    // ── Phase 2: Deduplicate URLs, scrape with Firecrawl in parallel ──────────
    const seenUrls = new Set<string>();
    const articles: ArticleForClassification[] = [];
    const dateMap = new Map<string, string>();
    const keywordMap = new Map<string, string>(); // url → first keyword that found it

    allResults.forEach((results, kwIdx) => {
      for (const r of results) {
        if (!seenUrls.has(r.link)) {
          seenUrls.add(r.link);
          articles.push({
            url: r.link,
            title: r.title,
            snippet: r.snippet,
            content: r.snippet,
          });
          if (r.date) dateMap.set(r.link, r.date);
          if (useKeywords && keywords[kwIdx]) keywordMap.set(r.link, keywords[kwIdx]!);
        }
      }
    });

    const urlsSentToFirecrawl = articles.map((a) => a.url);

    const scrapeResults = await Promise.allSettled(
      articles.map(async (a) =>
        (await isPdf(a.url)) ? null : scrapeWithFirecrawl(a.url),
      ),
    );

    const firecrawlSuccess: string[] = [];
    const firecrawlFailed: string[] = [];
    scrapeResults.forEach((result, i) => {
      if (result.status === "fulfilled" && result.value) {
        articles[i].content = result.value;
        firecrawlSuccess.push(articles[i].url);
      } else {
        firecrawlFailed.push(articles[i].url);
      }
    });

    const urlsSentToClaude = articles.map((a) => a.url);

    // ── Phase 3: Claude classification ───────────────────────────────────────
    const classified = await classifyWithClaude(
      client,
      articles,
      sanitizedSubject,
      countries,
      keywords,
      subjectType,
      outputLanguageName,
      scanFocus,
    );

    const deduped = dedupeLinks(classified)
      .map((link) => ({
        ...link,
        date: dateMap.get(link.url),
        keyword: keywordMap.get(link.url),
      }))
      .sort((a, b) => {
        const da = a.date ? parseSerperDate(a.date) : NaN;
        const db = b.date ? parseSerperDate(b.date) : NaN;
        const validA = !isNaN(da);
        const validB = !isNaN(db);
        if (validA && validB) return db - da;
        if (validA) return -1;
        if (validB) return 1;
        return 0;
      });
    const negative = deduped.filter((l) => l.sentiment === "negative");
    const positive = deduped.filter((l) => l.sentiment === "positive");
    const neutral = deduped.filter((l) => l.sentiment === "neutral");

    const summary = await generateMeetingSummary(
      client,
      sanitizedSubject,
      deriveScoreServer(negative.length, positive.length),
      deduped,
      outputLanguageName,
    );

    return NextResponse.json({
      links: deduped,
      negative,
      positive,
      neutral,
      summary,
      score: deriveScoreServer(negative.length, positive.length),
      // _serper: keywords.map((kw, i) => ({
      //   keyword: kw,
      //   query: searchQueries[i]!,
      //   count: allResults[i].length,
      //   links: allRaw[i].flatMap((page) =>
      //     (page.organic ?? []).map((r) => r.link),
      //   ),
      // })),
      // _firecrawl: keywords.map((kw) => ({
      //   keyword: kw,
      //   sent: urlsSentToFirecrawl.filter((u) => keywordMap.get(u) === kw),
      //   success: firecrawlSuccess.filter((u) => keywordMap.get(u) === kw),
      //   failed: firecrawlFailed.filter((u) => keywordMap.get(u) === kw),
      // })),
      // _claude: keywords.map((kw) => ({
      //   keyword: kw,
      //   sent: urlsSentToClaude.filter((u) => keywordMap.get(u) === kw),
      // })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
