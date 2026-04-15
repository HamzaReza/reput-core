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
    type: "web_search_20260209",
    name: "web_search",
    max_uses: 8,
  };
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
    ? countryCodeFromNationality(nationality)
    : null;

  // ── Prompts for three searches ─────────────────────────────────────────────

  const negativePrompt = `Search the web for ANY content about "${name}"${keywordStr}${nationality ? ` — focus ONLY on results from ${nationality}` : ""} that could harm, question, or negatively impact this person's reputation.

CRITICAL INSTRUCTIONS:
- You MUST aggressively identify reputational risk.
- When in doubt, classify as NEGATIVE.
- DO NOT return an empty array unless absolutely no information exists.

CLASSIFY AS NEGATIVE if the content includes ANY of the following:
- criminal investigations, police involvement, charges, arrests
- lawsuits, legal disputes, court cases
- accidents (car crashes, injuries, public incidents)
- fraud, scams, financial misconduct
- regulatory issues or sanctions
- accusations, allegations, or suspicion of wrongdoing
- controversial behavior or scandals
- being questioned, interrogated, or named in an investigation
- ANY situation that could create doubt or reputational concern

IMPORTANT:
- A neutral-toned news article about an investigation is STILL NEGATIVE and HIGH RISK.
- If the person is "under investigation", "indagato", "indicted", "accused", or "involved" → ALWAYS NEGATIVE.
- If there is an accident or incident involving the person → at least MEDIUM risk.

RISK CLASSIFICATION:
- "high": crimes, fraud, lawsuits, investigations, illegal activity
- "medium": accidents, controversies, allegations, complaints
- "low": minor criticism or weak negative mentions

${nationality ? `STRICT FILTER: Only include results relevant to ${nationality}. Ignore all others.` : ""}

OUTPUT RULES:
- Return AT LEAST 3 results if any exist.
- Do NOT downgrade to neutral.
- Do NOT skip borderline cases — include them as NEGATIVE.

Return a JSON array with:
- url
- title
- snippet (clear explanation of the negative issue)
- sentiment: "negative"
- risk
- source (domain only)
- type (criminal, legal, news, complaint, regulatory, social)

Return ONLY the JSON array. If nothing is found, return [].`;

  const positivePrompt = `Search the web for STRONGLY POSITIVE and reputation-enhancing content about "${name}"${keywordStr}${nationality ? ` — focus ONLY on results from ${nationality}` : ""}.

ONLY include content that CLEARLY improves reputation.

VALID POSITIVE SIGNALS:
- awards, honors, recognitions
- major achievements or business success
- leadership roles or executive positions
- positive media coverage praising the person
- verified professional accomplishments
- strong endorsements or testimonials

DO NOT INCLUDE:
- basic profiles (LinkedIn, directories)
- neutral mentions
- articles that simply mention the name
- content without clear praise or achievement

STRICT RULE:
- If it is not clearly impressive → DO NOT include it.
- It must actively boost reputation.

${nationality ? `Only include results relevant to ${nationality}.` : ""}

Return a JSON array with:
- url
- title
- snippet
- sentiment: "positive"
- risk: "none"
- source
- type (award, achievement, news, profile)

Return ONLY the JSON array. If none found, return [].`;

  const neutralPrompt = `Search the web for GENERAL INFORMATION about "${name}"${keywordStr}${nationality ? ` — focus ONLY on results from ${nationality}` : ""}.

This is a FALLBACK classification — use carefully.

INSTRUCTIONS:
- If content contains ANY legal issue, investigation, controversy, or incident → classify as NEGATIVE instead.
- Do NOT label risky content as neutral.

ONLY classify as NEUTRAL if:
- it is purely informational (Wikipedia, company listing, profile)
- there is ZERO reputational concern
- no accusations, incidents, or legal mentions

CLASSIFY AS POSITIVE if:
- it clearly shows achievements or praise

CLASSIFY AS NEGATIVE if:
- ANY risk, controversy, or legal issue exists (even minor)

${nationality ? `Only include results relevant to ${nationality}.` : ""}

Return a JSON array with:
- url
- title
- snippet
- sentiment ("positive" | "neutral" | "negative")
- risk ("high" | "medium" | "low" | "none")
- source
- type (profile, wiki, directory, news)

Return ONLY the JSON array. If none found, return [].`;
  try {
    // Run all three searches in parallel
    const [negLinks, posLinks, neutralLinks] = await Promise.all([
      runSearch(client, negativePrompt, countryCode),
      runSearch(client, positivePrompt, countryCode),
      runSearch(client, neutralPrompt, countryCode),
    ]);

    function dedupeLinks(all: WebLink[]): WebLink[] {
      const map = new Map<string, WebLink>();

      const sentimentPriority = {
        negative: 3,
        neutral: 2,
        positive: 1,
      };

      const riskPriority = {
        high: 4,
        medium: 3,
        low: 2,
        none: 1,
      };

      for (const link of all) {
        const existing = map.get(link.url);

        if (!existing) {
          map.set(link.url, link);
          continue;
        }

        const existingScore =
          sentimentPriority[existing.sentiment] * 10 +
          riskPriority[existing.risk];

        const newScore =
          sentimentPriority[link.sentiment] * 10 + riskPriority[link.risk];

        // Keep the WORSE one (higher score)
        if (newScore > existingScore) {
          map.set(link.url, link);
        }
      }

      return Array.from(map.values());
    }

    const allLinksRaw = [...negLinks, ...posLinks, ...neutralLinks];
    const deduped = dedupeLinks(allLinksRaw);

    const negative = deduped.filter((l) => l.sentiment === "negative");
    const positive = deduped.filter((l) => l.sentiment === "positive");
    const neutral = deduped.filter((l) => l.sentiment === "neutral");

    return NextResponse.json({
      links: deduped,
      negative,
      positive,
      neutral,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
