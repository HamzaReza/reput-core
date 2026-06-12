import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 800;

export async function POST(req: NextRequest) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
  const authorization = req.headers.get("authorization");
  const contentType = req.headers.get("content-type") ?? "application/json";
  const body = await req.text();

  const upstream = await fetch(`${apiUrl}/generate-lead`, {
    method: "POST",
    headers: {
      "Content-Type": contentType,
      ...(authorization ? { Authorization: authorization } : {}),
    },
    body,
  }).catch(() => null);

  if (!upstream) {
    return NextResponse.json(
      { error: "Failed to reach upstream generate-lead service." },
      { status: 502 },
    );
  }

  return new NextResponse(await upstream.text(), {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/json",
    },
  });
}
