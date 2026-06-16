import { getToken } from "@/lib/api";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export function wrapHtmlDocument(css: string, bodyHtml: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${bodyHtml}</body></html>`;
}

/** POSTs report HTML to repute-api's Browserless-backed export endpoint and triggers a file download. */
export async function requestPdfExport(params: {
  html: string;
  filename: string;
}): Promise<void> {
  const token = getToken();
  const res = await fetch(`${BASE_URL}/export-pdf`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      html: params.html,
      filename: params.filename,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const detail =
      body && typeof body === "object" && "detail" in body
        ? String((body as { detail: unknown }).detail)
        : "";
    throw new Error(detail || `PDF export failed (${res.status})`);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = params.filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
