import Anthropic from "@anthropic-ai/sdk";
import { COUNTRY_NAME_TO_ISO } from "@/lib/countries";
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
  // Short names that differ from ISO 3166-1 official names in `COUNTRY_NAME_TO_ISO`
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

function buildSearchTool(countryCode: string | null): Record<string, unknown> {
  const tool: Record<string, unknown> = {
    type: "web_search_20250305",
    name: "web_search",
    max_uses: 8,
  };
  if (countryCode) {
    tool.user_location = { type: "approximate", country: countryCode };
  }
  return tool;
}

async function runSearch(
  client: Anthropic,
  prompt: string,
  countryCode: string | null,
): Promise<WebLink[]> {
  const searchTool = buildSearchTool(countryCode);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    tools: [searchTool] as any,
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
  const keywordStr = keywords?.length
    ? `, keywords: ${keywords.join(", ")}`
    : "";

  const countryCode = nationality ? countryCodeFromNationality(nationality) : null;

  // ── Prompts for three searches ─────────────────────────────────────────────

  const negativePrompt = `Search the web for content about "${name}"${keywordStr}${nationality ? ` — focus on results from ${nationality}` : ""} that could harm their reputation.

IMPORTANT: Judge sentiment based on the REPUTATIONAL IMPACT of the content, NOT the journalistic tone. A factually-written news article about a criminal investigation is NEGATIVE and HIGH RISK — even if the writing style is neutral.

Look for: criminal investigations, lawsuits, fraud allegations, hit-and-run incidents, identity fraud, illegal activity, complaints, bad reviews, scams, controversy, regulatory actions, or any content that damages reputation.

CLASSIFY AS NEGATIVE if the subject is: investigated for a crime, sued, accused of wrongdoing, involved in a scandal, caught in illegal activity — regardless of how the article is written.

${nationality ? `Only include results that are relevant to ${nationality} — ignore results from other regions or countries.` : ""}
For each negative result found, return a JSON array with objects having these exact fields:
- url: the full URL
- title: page title
- snippet: brief description of the negative content (1-2 sentences)
- sentiment: "negative"
- risk: "high" (criminal investigation/fraud/lawsuit/scam/illegal activity), "medium" (complaints/controversy/bad reviews/family disputes), or "low" (minor negative mentions)
- source: domain name only (e.g. "reddit.com")
- type: category like "complaint", "news", "review", "legal", "social", "regulatory", "criminal"

Return ONLY the JSON array, no explanation. If no negative results found, return [].`;

  const positivePrompt = `Search the web for POSITIVE content about "${name}"${keywordStr}${nationality ? ` — focus on results from ${nationality}` : ""}.

Look for: positive news coverage, awards, achievements, endorsements, good reviews, community recognition, professional accomplishments, or any reputation-boosting content.
${nationality ? `Only include results relevant to ${nationality} — ignore results from other regions.` : ""}
For each positive result found, return a JSON array with objects having these exact fields:
- url: the full URL
- title: page title
- snippet: brief description of the positive content (1-2 sentences)
- sentiment: "positive"
- risk: "none"
- source: domain name only (e.g. "linkedin.com")
- type: category like "award", "news", "review", "achievement", "social", "profile"

Return ONLY the JSON array, no explanation. If nothing found, return [].`;

  const neutralPrompt = `Search the web for general informational content about "${name}"${keywordStr}${nationality ? ` — focus on results from ${nationality}` : ""}.

Look for: Wikipedia pages, business listings, professional profiles, factual news mentions, company registrations, or any informational content.
${nationality ? `Only include results relevant to ${nationality} — ignore results from other regions.` : ""}
For each result found, return a JSON array with objects having these exact fields:
- url: the full URL
- title: page title
- snippet: brief description of the content (1-2 sentences)
- sentiment: assess honestly — "negative" if the content involves legal trouble, investigations, crimes, lawsuits, scandals, or reputational damage; "positive" if it shows achievements or praise; "neutral" if purely informational with no accusations
- risk: assess honestly — "high" (fraud/criminal/lawsuit/scam), "medium" (complaints/controversy/bad reviews), "low" (minor negative mentions), "none" (neutral or positive content)
- source: domain name only (e.g. "wikipedia.org")
- type: category like "profile", "directory", "wiki", "news", "registry", "legal", "complaint"

Return ONLY the JSON array, no explanation. If nothing found, return [].`;

  try {
    // Run all three searches in parallel
    const [negLinks, posLinks, neutralLinks] = await Promise.all([
      runSearch(client, negativePrompt, countryCode),
      runSearch(client, positivePrompt, countryCode),
      runSearch(client, neutralPrompt, countryCode),
    ]);

    return NextResponse.json({
      links: [...negLinks, ...posLinks, ...neutralLinks],
      negative: negLinks,
      positive: posLinks,
      neutral: neutralLinks,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
