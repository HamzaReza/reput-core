import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

export interface NegativeLink {
  url: string;
  title: string;
  snippet: string;
  risk: "high" | "medium" | "low";
  source: string;
  type: string;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
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

  const keywordStr = keywords?.length ? `, keywords: ${keywords.join(", ")}` : "";
  const regionStr = nationality ? ` in ${nationality}` : "";
  const prompt = `Search the web for negative content about "${name}"${keywordStr}${regionStr ? ` — focus on results from ${nationality}` : ""}.

Look for: complaints, lawsuits, fraud allegations, negative news articles, bad reviews, scams, controversy, criminal records, or any reputational risk.
${nationality ? `\nOnly include results that are relevant to ${nationality} — ignore results from other regions or countries.` : ""}
For each negative result found, return a JSON array with objects having these exact fields:
- url: the full URL
- title: page title
- snippet: brief description of the negative content (1-2 sentences)
- risk: "high" (fraud/criminal/lawsuit), "medium" (complaints/controversy), or "low" (minor negative)
- source: domain name only (e.g. "reddit.com")
- type: category like "complaint", "news", "review", "legal", "social"

Return ONLY the JSON array, no explanation. If no negative results found, return [].`;

  // Map common nationality/country strings to ISO 3166-1 alpha-2 codes
  const COUNTRY_CODES: Record<string, string> = {
    afghanistan: "AF", albania: "AL", algeria: "DZ", argentina: "AR",
    australia: "AU", austria: "AT", azerbaijan: "AZ", bahrain: "BH",
    bangladesh: "BD", belgium: "BE", brazil: "BR", canada: "CA",
    chile: "CL", china: "CN", colombia: "CO", croatia: "HR",
    czechia: "CZ", "czech republic": "CZ", denmark: "DK", egypt: "EG",
    ethiopia: "ET", finland: "FI", france: "FR", germany: "DE",
    ghana: "GH", greece: "GR", hungary: "HU", india: "IN",
    indonesia: "ID", iran: "IR", iraq: "IQ", ireland: "IE",
    israel: "IL", italy: "IT", japan: "JP", jordan: "JO",
    kazakhstan: "KZ", kenya: "KE", kuwait: "KW", lebanon: "LB",
    libya: "LY", malaysia: "MY", mexico: "MX", morocco: "MA",
    netherlands: "NL", "new zealand": "NZ", nigeria: "NG", norway: "NO",
    oman: "OM", pakistan: "PK", palestine: "PS", peru: "PE",
    philippines: "PH", poland: "PL", portugal: "PT", qatar: "QA",
    romania: "RO", russia: "RU", "saudi arabia": "SA", senegal: "SN",
    serbia: "RS", singapore: "SG", "south africa": "ZA", "south korea": "KR",
    spain: "ES", "sri lanka": "LK", sudan: "SD", sweden: "SE",
    switzerland: "CH", syria: "SY", taiwan: "TW", thailand: "TH",
    tunisia: "TN", turkey: "TR", turkiye: "TR", ukraine: "UA",
    "united arab emirates": "AE", uae: "AE", "united kingdom": "GB",
    uk: "GB", "united states": "US", usa: "US", "united states of america": "US",
    uzbekistan: "UZ", venezuela: "VE", vietnam: "VN", yemen: "YE",
    zimbabwe: "ZW",
  };

  const countryCode = nationality
    ? (COUNTRY_CODES[nationality.toLowerCase().trim()] ?? null)
    : null;

  // Build user_location if nationality maps to a valid ISO code
  const searchTool: Record<string, unknown> = {
    type: "web_search_20250305",
    name: "web_search",
    max_uses: 5,
  };
  if (countryCode) {
    searchTool.user_location = {
      type: "approximate",
      country: countryCode,
    };
  }

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tools: [searchTool] as any,
      messages: [{ role: "user", content: prompt }],
    });

    // Extract the final text block from Claude's response
    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ links: [] });
    }

    // Parse the JSON array from Claude's response
    const raw = textBlock.text.trim();
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return NextResponse.json({ links: [] });
    }

    const links: NegativeLink[] = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ links });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
