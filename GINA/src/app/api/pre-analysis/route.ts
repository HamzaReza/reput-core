import { COUNTRY_NAME_TO_ISO } from "@/lib/countries";
import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

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
  negative_findings: string;
  positive_presence: string;
  reputation_notes: string;
}

const FALLBACK_PROFILE: PreAnalysisProfile = {
  identity: "No public information found for this subject.",
  background:
    "Either no public information found or the context provided is not enough to generate a profile.",
  negative_findings: "No negative findings in available sources.",
  positive_presence: "No positive coverage found in available sources.",
  reputation_notes: "Insufficient data to assess reputation.",
};

const FALLBACK = {
  profile: FALLBACK_PROFILE,
  keywords: [],
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
      keywordFocus = "all",
      subjectType = "individual",
      reportLanguage,
    } = body as {
      firstName?: string;
      lastName?: string;
      company?: string;
      country: string;
      description: string;
      keywordsCap?: number;
      keywordFocus?: string;
      subjectType?: "individual" | "company";
      reportLanguage?: string;
    };

    if (!country) {
      return NextResponse.json(
        { error: "country is required." },
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
    const fullName =
      `${(firstName ?? "").trim()} ${(lastName ?? "").trim()}`.trim();
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

    const searchSystem =
      subjectType === "company"
        ? `You are a research analyst with web search access. Search for public information about the company described. Try multiple searches: by company name alone, by company name and country, and by company name with contextual details. Write a comprehensive factual summary of everything you find — business background, legal issues, regulatory sanctions, controversies, financial performance, customer complaints, positive coverage. Write in ${languageName}.`
        : `You are a research analyst with web search access. Search for public information about the person described. Try multiple searches: by name alone, by name and company, and by name with any contextual details. Write a comprehensive factual summary of everything you find — professional background, controversies, legal issues, positive coverage, notable mentions. Write in ${languageName}.`;

    const searchContent =
      subjectType === "company"
        ? `Research this company:\n\nCompany: ${company}\nCountry: ${country}${description?.trim() ? `\nContext: ${description.trim()}` : ""}`
        : `Research this person:\n\nName: ${fullName}${company ? `\nCompany: ${company}` : ""}\nCountry: ${country}${description?.trim() ? `\nContext: ${description.trim()}` : ""}`;

    const formatIdentityHint =
      subjectType === "company"
        ? "<1-2 sentences: company name, industry, country, area of operation>"
        : "<1-2 sentences: full name, known roles, nationality, area of operation>";
    const formatBackgroundHint =
      subjectType === "company"
        ? "<2-3 sentences: business history, sector, key products/services, notable activities>"
        : "<2-3 sentences: professional history, companies, sector, notable activities>";

    let profile: PreAnalysisProfile = FALLBACK_PROFILE;
    let keywords: string[] = [];

    try {
      // Call 1: web search → prose research summary
      const searchMsg = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        system: searchSystem,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tools: [{ type: "web_search_20260209", name: "web_search" } as any],
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
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system: `You are a data formatter. Convert the research summary into the specified JSON shape. Write ALL field values and ALL keywords in ${languageName}. Output ONLY valid JSON — no markdown fences, no explanation, no extra keys.`,
        messages: [
          {
            role: "user",
            content: `Research summary about ${subjectLabel}:\n${researchSummary}\n\nReturn ONLY this JSON (no explanation, no markdown):\n{\n  "profile": {\n    "identity": "${formatIdentityHint}",\n    "background": "${formatBackgroundHint}",\n    "negative_findings": "<2-4 sentences: legal issues, controversies, accusations — if none write 'No negative findings in available sources'>",\n    "positive_presence": "<2-3 sentences: positive coverage, awards, neutral public mentions>",\n    "reputation_notes": "<1-2 sentences: overall reputational assessment>"\n  },\n  "keywords": ["<keyword1>", ...]\n}\nRules: every field populated, based only on the summary above, ${keywordFocusRule}`,
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
