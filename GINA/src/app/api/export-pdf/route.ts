import puppeteerCore from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer";

export const runtime = "nodejs";
export const maxDuration = 60;

async function getBrowser() {
  if (process.env.NODE_ENV === "production") {
    const executablePath = await chromium.executablePath();
    return puppeteerCore.launch({
      args: chromium.args,
      executablePath,
      headless: true,
    });
  }
  return puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
}

export async function POST(request: Request) {
  const { html, filename } = await request.json();

  let browser: Awaited<ReturnType<typeof getBrowser>> | undefined;

  try {
    browser = await getBrowser();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    const pdf = await page.pdf({ format: "A4", printBackground: true });
    return new Response(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  } finally {
    await browser?.close();
  }
}
