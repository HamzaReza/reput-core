import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  const { firstName, lastName, company, country, description, keywordsCap } =
    (await req.json()) as {
      firstName: string;
      lastName: string;
      company?: string;
      country: string;
      description: string;
      keywordsCap?: number;
    };

  if (!firstName || !lastName || !country || !description) {
    return NextResponse.json({ error: "Required fields missing" }, { status: 400 });
  }

  const name = `${firstName.trim()} ${lastName.trim()}`.trim();
  const keywordCount = Math.min(8, Math.max(3, keywordsCap ?? 5));
  const companyLine = company?.trim() ? ` who works at ${company.trim()}` : "";

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      messages: [{
        role: "user",
        content: `You are a reputation intelligence analyst. Based on this background about "${name}"${companyLine} from ${country}, generate exactly ${keywordCount} targeted search terms that would help find negative press, legal issues, controversies, lawsuits, fraud, or reputational risks on Google.

Background:
${description}

Rules:
- Each term must be 1 or 2 words maximum
- Terms must work well as Google search keywords alongside a person's name
- Do not include the person's name in the terms
- Focus on risk areas suggested by the background

Return ONLY a JSON array of exactly ${keywordCount} keyword strings. Example: ["fraud", "lawsuit", "money laundering", "scam", "arrest"]`,
      }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ error: "Failed to generate keywords" }, { status: 500 });
    }

    const match = textBlock.text.trim().match(/\[[\s\S]*\]/);
    if (!match) {
      return NextResponse.json({ error: "Failed to parse keywords" }, { status: 500 });
    }

    const keywords = JSON.parse(match[0]) as string[];
    return NextResponse.json({ keywords });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
