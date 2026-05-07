import { COUNTRY_NAME_TO_ISO } from "@/lib/countries";
import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

interface SerperResult {
  title: string;
  link: string;
  snippet: string;
}

interface SerperResponse {
  organic: SerperResult[];
}

const NATIONALITY_ALIASES: Record<string, string> = {
  american: "US",
  australian: "AU",
  austrian: "AT",
  belgian: "BE",
  brazilian: "BR",
  british: "GB",
  canadian: "CA",
  chinese: "CN",
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
  irish: "IE",
  israeli: "IL",
  italian: "IT",
  japanese: "JP",
  korean: "KR",
  malaysian: "MY",
  mexican: "MX",
  moroccan: "MA",
  nigerian: "NG",
  norwegian: "NO",
  pakistani: "PK",
  polish: "PL",
  portuguese: "PT",
  romanian: "RO",
  russian: "RU",
  saudi: "SA",
  singaporean: "SG",
  spanish: "ES",
  swedish: "SE",
  swiss: "CH",
  thai: "TH",
  turkish: "TR",
  ukrainian: "UA",
  uk: "GB",
  "united kingdom": "GB",
  usa: "US",
  "united states": "US",
  "south korea": "KR",
  turkey: "TR",
  uae: "AE",
  vietnam: "VN",
  vietnamese: "VN",
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
  RU: "ru",
  UA: "uk",
  TR: "tr",
  JP: "ja",
  KR: "ko",
  CN: "zh-CN",
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

function countryCodeFromName(country: string): string | null {
  const k = country.toLowerCase().trim();
  return COUNTRY_NAME_TO_ISO[k] ?? NATIONALITY_ALIASES[k] ?? null;
}

async function searchSerper(
  query: string,
  countryCode: string | null,
  numResults = 5,
): Promise<SerperResult[]> {
  const serperKey = process.env.SERPER_API_KEY;
  if (!serperKey) throw new Error("SERPER_API_KEY not configured");

  const payload: Record<string, unknown> = { q: query, num: numResults };
  if (countryCode) payload.gl = countryCode.toLowerCase();
  const lang = countryCode
    ? COUNTRY_TO_LANGUAGE[countryCode.toUpperCase()]
    : null;
  if (lang) payload.hl = lang;

  const res = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-KEY": serperKey },
    body: JSON.stringify(payload),
  });

  if (!res.ok) return [];
  const data = (await res.json()) as SerperResponse;
  return data.organic ?? [];
}

interface PreAnalysisProfile {
  identity: string;
  background: string;
  negative_findings: string;
  positive_presence: string;
  reputation_notes: string;
}

const FALLBACK_PROFILE: PreAnalysisProfile = {
  identity: "No public information found for this subject.",
  background: "Either no public information found or the context provided is not enough to generate a profile.",
  negative_findings: "No negative findings in available sources.",
  positive_presence: "No positive coverage found in available sources.",
  reputation_notes: "Insufficient data to assess reputation.",
};

const FALLBACK = {
  profile: FALLBACK_PROFILE,
  keywords: [],
  sources: [],
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      firstName,
      lastName,
      company,
      country,
      description,
      keywordsCap = 5,
    } = body as {
      firstName: string;
      lastName: string;
      company?: string;
      country: string;
      description: string;
      keywordsCap?: number;
    };

    if (!firstName || !lastName || !country) {
      return NextResponse.json(
        { error: "firstName, lastName and country are required." },
        { status: 400 },
      );
    }

    const cap = Math.min(8, Math.max(3, Number(keywordsCap) || 5));
    const countryCode = countryCodeFromName(country);
    const fullName = `${firstName.trim()} ${lastName.trim()}`;

    // Build 2–3 search queries
    const queries: string[] = [`"${fullName}"`];
    if (company?.trim()) queries.push(`"${fullName}" "${company.trim()}"`);
    if (description?.trim()) {
      const words = description.trim().split(/\s+/).slice(0, 6).join(" ");
      queries.push(`"${fullName}" ${words}`);
    }

    // Run searches in parallel
    const resultsPerQuery = await Promise.allSettled(
      queries.map((q) => searchSerper(q, countryCode, 5)),
    );

    // Deduplicate by URL, collect up to 10
    const seen = new Set<string>();
    const organic: { title: string; url: string; snippet: string }[] = [];
    for (const r of resultsPerQuery) {
      if (r.status !== "fulfilled") continue;
      for (const item of r.value) {
        if (!seen.has(item.link) && organic.length < 10) {
          seen.add(item.link);
          organic.push({
            title: item.title,
            url: item.link,
            snippet: item.snippet,
          });
        }
      }
    }

    if (organic.length === 0) {
      return NextResponse.json(FALLBACK);
    }

    // Ask Claude to summarise and suggest keywords
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const searchContext = organic
      .map((r, i) => `[${i + 1}] ${r.title}\n${r.snippet}\nURL: ${r.url}`)
      .join("\n\n");

    const userPrompt = `Subject: ${fullName}${company ? ` (${company})` : ""}
Country: ${country}
Description: ${description || "N/A"}

Web search results:
${searchContext}

Respond ONLY with valid JSON in this exact shape:
{
  "profile": {
    "identity": "<1-2 sentences: full name, known roles, nationality, area of operation>",
    "background": "<2-3 sentences: professional history, companies, sector, notable activities>",
    "negative_findings": "<2-4 sentences: legal issues, controversies, accusations, proceedings — if none found write 'No negative findings in available sources'>",
    "positive_presence": "<2-3 sentences: positive coverage, awards, interviews, neutral public mentions>",
    "reputation_notes": "<1-2 sentences: overall reputational assessment based solely on what was found>"
  },
  "keywords": ["<keyword1>", "<keyword2>", ...]
}

Rules:
- Every field in profile must be populated — never return null or empty string
- Base every statement strictly on the search results provided — do not invent facts
- negative_findings: if operator description mentions specific issues, prioritise those
- keywords: exactly ${cap} items, 1-2 words each, reputation-relevant search terms, do NOT include the person's name`;

    let profile: PreAnalysisProfile = FALLBACK_PROFILE;
    let keywords: string[] = [];

    try {
      const msg = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system:
          "You are a research analyst. Analyse web search results about a person and produce a structured reputation profile. Output only valid JSON, no markdown fences, no extra keys.",
        messages: [{ role: "user", content: userPrompt }],
      });

      const text =
        msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
      const parsed = JSON.parse(text) as {
        profile: PreAnalysisProfile;
        keywords: string[];
      };
      profile = parsed.profile ?? profile;
      keywords = Array.isArray(parsed.keywords)
        ? parsed.keywords.slice(0, cap)
        : [];
    } catch {
      // Claude failed — return fallback profile without keywords
    }

    return NextResponse.json({
      profile,
      keywords,
      sources: organic.slice(0, 5),
    });
  } catch (err) {
    console.error("[pre-analysis]", err);
    return NextResponse.json(FALLBACK);
  }
}
