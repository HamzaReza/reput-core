import { COUNTRY_NAME_TO_ISO } from "@/lib/countries";
import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 800;

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

const LANGUAGE_CODE_TO_NAME: Record<string, string> = {
  en: "English",
  it: "Italian",
  es: "Spanish",
  fr: "French",
  de: "German",
  pt: "Portuguese",
  nl: "Dutch",
  pl: "Polish",
  ro: "Romanian",
  hu: "Hungarian",
  cs: "Czech",
  ru: "Russian",
  uk: "Ukrainian",
  tr: "Turkish",
  ja: "Japanese",
  ko: "Korean",
  "zh-CN": "Chinese",
  ar: "Arabic",
  hi: "Hindi",
  th: "Thai",
  vi: "Vietnamese",
  id: "Indonesian",
  ms: "Malay",
  el: "Greek",
  sv: "Swedish",
  no: "Norwegian",
  fi: "Finnish",
  da: "Danish",
};

function countryCodeFromName(country: string): string | null {
  const k = country.toLowerCase().trim();
  return COUNTRY_NAME_TO_ISO[k] ?? NATIONALITY_ALIASES[k] ?? null;
}

interface PreAnalysisProfile {
  identity: string;
  background: string;
  associations: string;
  recent_news: string;
  negative_findings: string;
  positive_presence: string;
  reputation_notes: string;
  estimated_negative_links?: { low: number; high: number; reasoning: string };
}

const FALLBACK_PROFILE: PreAnalysisProfile = {
  identity: "No public information found for this subject.",
  background: "Either no public information found or the context provided is not enough to generate a profile.",
  associations: "No known associations found in available sources.",
  recent_news: "No recent news found in available sources.",
  negative_findings: "No negative findings in available sources.",
  positive_presence: "No positive coverage found in available sources.",
  reputation_notes: "Insufficient data to assess reputation.",
};

const FALLBACK = {
  profile: FALLBACK_PROFILE,
  keywords: [],
};

export async function POST(req: NextRequest) {
  const token = req.headers.get("Authorization");
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
  const authCheck = await fetch(`${apiUrl}/web-analysts/me`, {
    headers: { Authorization: token },
  }).catch(() => null);
  if (!authCheck || !authCheck.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      firstName,
      middleName,
      lastName,
      company,
      country: countrySingle,
      countries: countriesRaw,
      description,
      keywordsCap = 5,
      keywordFocus = "all",
      subjectType = "individual",
      reportLanguage,
      scanTier = "standard",
    } = body as {
      firstName?: string;
      middleName?: string;
      lastName?: string;
      company?: string;
      country?: string;
      countries?: string[];
      description: string;
      keywordsCap?: number;
      keywordFocus?: string;
      subjectType?: "individual" | "company";
      reportLanguage?: string;
      scanTier?: "standard" | "advanced";
    };

    const model = scanTier === "standard" ? "claude-haiku-4-5-20251001" : "claude-sonnet-4-6";
    const webSearchTool = scanTier === "standard" ? "web_search_20250305" : "web_search_20260209";

    // Normalize to array — accept both legacy `country` string and new `countries` array
    const countries: string[] = Array.isArray(countriesRaw) && countriesRaw.length > 0
      ? countriesRaw
      : countrySingle ? [countrySingle] : [];
    const country = countries[0] ?? "";

    if (!countries.length) {
      return NextResponse.json(
        { error: "At least one country is required." },
        { status: 400 },
      );
    }
    if (subjectType === "individual" && (!firstName || !lastName)) {
      return NextResponse.json(
        {
          error: "firstName and lastName are required for individual subjects.",
        },
        { status: 400 },
      );
    }
    if (subjectType === "company" && !company) {
      return NextResponse.json(
        { error: "company is required for company subjects." },
        { status: 400 },
      );
    }

    const cap = Math.min(8, Math.max(3, Number(keywordsCap) || 5));
    const REPORT_LANG_MAP: Record<string, string> = {
      en: "English",
      it: "Italian",
      es: "Spanish",
    };
    const countryCode = countryCodeFromName(country);
    const lang = countryCode
      ? COUNTRY_TO_LANGUAGE[countryCode.toUpperCase()]
      : null;
    const languageName = reportLanguage
      ? (REPORT_LANG_MAP[reportLanguage] ?? "English")
      : ((lang ? LANGUAGE_CODE_TO_NAME[lang] : null) ?? "English");
    const fullName = [firstName, middleName, lastName]
      .map((s) => (s ?? "").trim())
      .filter(Boolean)
      .join(" ");
    const subjectLabel =
      subjectType === "company" ? (company ?? fullName) : fullName;

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const noNameInstruction =
      subjectType === "company"
        ? `Do NOT include the company name itself as a keyword.`
        : `Do NOT include the person's name.`;

    const keywordFocusRule =
      {
        negative: `keywords: up to ${cap} items (minimum 1) — ADVERSE terms only: legal disputes, fraud, misconduct, scandal, complaints, litigation. ${noNameInstruction} All keywords in ${languageName}.`,
        positive: `keywords: up to ${cap} items (minimum 1) — POSITIVE terms only: achievements, awards, leadership, philanthropy, recognition. ${noNameInstruction} All keywords in ${languageName}.`,
        neutral: `keywords: up to ${cap} items (minimum 1) — NEUTRAL factual terms only: role, organisation, sector, projects. ${noNameInstruction} All keywords in ${languageName}.`,
        all: `keywords: up to ${cap} items (minimum 1), 1-2 words each, balanced mix across positive, negative and neutral reputation angles. ${noNameInstruction} All keywords in ${languageName}.`,
      }[keywordFocus] ??
      `keywords: up to ${cap} items (minimum 1), reputation-relevant. ${noNameInstruction} All keywords in ${languageName}.`;

    const countriesLabel = countries.join(", ");
    const searchSystem =
      subjectType === "company"
        ? `You are a senior investigative research analyst with web search access. Search thoroughly for public information about the company described. Run multiple searches: company name alone, company name + country (run for each country listed: ${countriesLabel}), company name + industry, company name + legal or controversy keywords, company name + key executives, company name + news ${new Date().getFullYear()}. For each search, look for: founding history and ownership, business model and revenue streams, key executives and leadership, regulatory filings or sanctions, litigation or legal disputes, customer reviews or complaints, financial performance, industry reputation, media coverage, partnerships and affiliations. Also explicitly search for the latest news — recent articles, press releases, announcements, incidents, or developments from the past 12 months. Write a detailed, comprehensive factual summary covering all angles — leave no dimension unexplored. Write in ${languageName}.`
        : `You are a senior investigative research analyst with web search access. Search thoroughly for public information about the person described. Run multiple searches: full name alone, name + company, name + each country (${countriesLabel}), name + industry, name + legal or controversy keywords, name + news ${new Date().getFullYear()}. For each search, look for: career history and current role, educational background, company affiliations and business ventures, legal proceedings or regulatory actions, media mentions and interviews, social media presence, awards or public recognition, controversies or allegations, known associates and partners. Also explicitly search for the latest news — recent articles, interviews, public statements, incidents, or developments involving this person from the past 12 months. Write a detailed, comprehensive factual summary covering all angles — leave no dimension unexplored. Write in ${languageName}.`;

    const searchContent =
      subjectType === "company"
        ? `Research this company:\n\nCompany: ${company}\nCountry: ${countriesLabel}${description?.trim() ? `\nContext: ${description.trim()}` : ""}`
        : `Research this person:\n\nName: ${fullName}${company ? `\nCompany: ${company}` : ""}\nCountry: ${countriesLabel}${description?.trim() ? `\nContext: ${description.trim()}` : ""}`;

    const formatIdentityHint =
      subjectType === "company"
        ? "<2-3 sentences: company name, industry, country of origin, area of operation, size or scale indicator>"
        : "<2-3 sentences: full name, known professional roles, nationality, geographic base, industry sector>";
    const formatBackgroundHint =
      subjectType === "company"
        ? "<5-7 sentences: founding story, business model, growth trajectory, key products or services, market position, major clients or partnerships, geographic reach>"
        : "<5-7 sentences: career arc from early career to present, key employers, roles held, major projects or deals, educational background if known, industry standing>";
    const formatAssociationsHint =
      subjectType === "company"
        ? "<3-5 sentences: parent company or subsidiaries, key investors or shareholders, notable clients or partners, industry associations, executive network>"
        : "<3-5 sentences: known business partners, employers, investors, political or professional affiliations, notable co-founders or collaborators, family business connections>";

    let profile: PreAnalysisProfile = FALLBACK_PROFILE;
    let keywords: string[] = [];

    try {
      // Call 1: web search → prose research summary
      const searchMsg = await anthropic.messages.create({
        model,
        max_tokens: 4096,
        system: searchSystem,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tools: [{ type: webSearchTool, name: "web_search" } as any],
        messages: [{ role: "user", content: searchContent }],
      });

      const researchSummary = searchMsg.content
        .filter((b) => b.type === "text")
        .map((b) => (b as { type: "text"; text: string }).text)
        .join("\n")
        .trim();

      if (!researchSummary) {
        return NextResponse.json({ profile, keywords });
      }

      // Call 2: format prose → structured JSON (no tools)
      const formatMsg = await anthropic.messages.create({
        model,
        max_tokens: 3000,
        system: `You are a data formatter. Convert the research summary into the specified JSON shape. Write ALL field values and ALL keywords in ${languageName}. Output ONLY valid JSON — no markdown fences, no explanation, no extra keys.`,
        messages: [
          {
            role: "user",
            content: `Research summary about ${subjectLabel}:\n${researchSummary}\n\nReturn ONLY this JSON (no explanation, no markdown):\n{\n  "profile": {\n    "identity": "${formatIdentityHint}",\n    "background": "${formatBackgroundHint}",\n    "associations": "${formatAssociationsHint}",\n    "recent_news": "<3-6 sentences: latest news, articles, announcements, incidents, or developments from the past 12 months — include dates where available; if none found write 'No recent news found in available sources'>",\n    "negative_findings": "<4-8 sentences: legal proceedings, regulatory sanctions, fraud allegations, controversies, scandals, complaints — include dates and specifics where available; if none write 'No negative findings in available sources'>",\n    "positive_presence": "<3-6 sentences: awards, recognitions, successful ventures, positive media coverage, industry leadership, philanthropic activities>",\n    "reputation_notes": "<2-4 sentences: overall reputational standing, key risk indicators, public perception summary, recommended scrutiny level>"\n  },\n  "keywords": ["<keyword1>", ...]\n}\nRules: every field fully populated with detail, based only on the summary above, ${keywordFocusRule}.`,
          },
        ],
      });

      const textBlock = formatMsg.content.find((b) => b.type === "text");
      if (textBlock && textBlock.type === "text") {
        const jsonMatch = textBlock.text.trim().match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]) as {
            profile: PreAnalysisProfile;
            keywords: string[];
          };
          profile = parsed.profile ?? profile;
          keywords = Array.isArray(parsed.keywords)
            ? parsed.keywords.slice(0, cap)
            : [];
        }
      }
    } catch (e) {
      console.error("[pre-analysis] error:", e);
    }

    return NextResponse.json({ profile, keywords });
  } catch (err) {
    console.error("[pre-analysis]", err);
    return NextResponse.json(FALLBACK);
  }
}
