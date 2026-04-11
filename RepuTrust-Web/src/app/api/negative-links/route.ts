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

// Map common nationality/country strings to ISO 3166-1 alpha-2 codes
const COUNTRY_CODES: Record<string, string> = {
  afghanistan: "AF",
  albania: "AL",
  algeria: "DZ",
  argentina: "AR",
  australia: "AU",
  austria: "AT",
  azerbaijan: "AZ",
  bahrain: "BH",
  bangladesh: "BD",
  belgium: "BE",
  brazil: "BR",
  canada: "CA",
  chile: "CL",
  china: "CN",
  colombia: "CO",
  croatia: "HR",
  czechia: "CZ",
  "czech republic": "CZ",
  denmark: "DK",
  egypt: "EG",
  ethiopia: "ET",
  finland: "FI",
  france: "FR",
  germany: "DE",
  ghana: "GH",
  greece: "GR",
  hungary: "HU",
  india: "IN",
  indonesia: "ID",
  iran: "IR",
  iraq: "IQ",
  ireland: "IE",
  israel: "IL",
  italy: "IT",
  japan: "JP",
  jordan: "JO",
  kazakhstan: "KZ",
  kenya: "KE",
  kuwait: "KW",
  lebanon: "LB",
  libya: "LY",
  malaysia: "MY",
  mexico: "MX",
  morocco: "MA",
  netherlands: "NL",
  "new zealand": "NZ",
  nigeria: "NG",
  norway: "NO",
  oman: "OM",
  pakistan: "PK",
  palestine: "PS",
  peru: "PE",
  philippines: "PH",
  poland: "PL",
  portugal: "PT",
  qatar: "QA",
  romania: "RO",
  russia: "RU",
  "saudi arabia": "SA",
  senegal: "SN",
  serbia: "RS",
  singapore: "SG",
  "south africa": "ZA",
  "south korea": "KR",
  spain: "ES",
  "sri lanka": "LK",
  sudan: "SD",
  sweden: "SE",
  switzerland: "CH",
  syria: "SY",
  taiwan: "TW",
  thailand: "TH",
  tunisia: "TN",
  turkey: "TR",
  turkiye: "TR",
  ukraine: "UA",
  "united arab emirates": "AE",
  uae: "AE",
  "united kingdom": "GB",
  uk: "GB",
  "united states": "US",
  usa: "US",
  "united states of america": "US",
  uzbekistan: "UZ",
  venezuela: "VE",
  vietnam: "VN",
  yemen: "YE",
  zimbabwe: "ZW",
};

function buildSearchTool(countryCode: string | null): Record<string, unknown> {
  const tool: Record<string, unknown> = {
    type: "web_search_20250305",
    name: "web_search",
    max_uses: 12,
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

  const countryCode = nationality
    ? (COUNTRY_CODES[nationality.toLowerCase().trim()] ?? null)
    : null;

  // ── Prompts for three searches ─────────────────────────────────────────────

  const negativePrompt = `Search the web for negative content about "${name}"${keywordStr}${nationality ? ` — focus on results from ${nationality}` : ""}.

Look for: complaints, lawsuits, fraud allegations, negative news articles, bad reviews, scams, controversy, criminal records, or any reputational risk.
${nationality ? `Only include results that are relevant to ${nationality} — ignore results from other regions or countries.` : ""}
For each negative result found, return a JSON array with objects having these exact fields:
- url: the full URL
- title: page title
- snippet: brief description of the negative content (1-2 sentences)
- sentiment: "negative"
- risk: "high" (fraud/criminal/lawsuit/scam), "medium" (complaints/controversy/bad reviews), or "low" (minor negative mentions)
- source: domain name only (e.g. "reddit.com")
- type: category like "complaint", "news", "review", "legal", "social", "regulatory"

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

  const neutralPrompt = `Search the web for NEUTRAL or informational content about "${name}"${keywordStr}${nationality ? ` — focus on results from ${nationality}` : ""}.

Look for: Wikipedia pages, business listings, professional profiles, factual news mentions, company registrations, or any informational content that is neither clearly positive nor negative.
${nationality ? `Only include results relevant to ${nationality} — ignore results from other regions.` : ""}
For each neutral result found, return a JSON array with objects having these exact fields:
- url: the full URL
- title: page title
- snippet: brief description of the content (1-2 sentences)
- sentiment: "neutral"
- risk: "none"
- source: domain name only (e.g. "wikipedia.org")
- type: category like "profile", "directory", "wiki", "news", "registry"

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
