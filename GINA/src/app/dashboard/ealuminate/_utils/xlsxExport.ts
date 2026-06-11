import type { WebLink } from "@/lib/api";

interface ExportLinksXlsxParams {
  fullName: string;
  country: string;
  keywords: string[];
  links: WebLink[];
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const HIGHLIGHT_ARGB = "FFBDD7EE"; // Blue, Accent 5, Lighter 60%
const LINK_FONT_ARGB = "FF0563C1"; // theme hyperlink blue
const DUP_FILL_ARGB = "FFFFC7CE";
const DUP_FONT_ARGB = "FF9C0006";

function sanitize(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

function parseDate(date?: string): { year: number; month: number } | null {
  if (!date) return null;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  return { year: d.getFullYear(), month: d.getMonth() };
}

// Year descending, month ascending within a year; dateless links sorted last.
function sortLinks(links: WebLink[]): WebLink[] {
  return links
    .map((link, i) => ({ link, i, parsed: parseDate(link.date) }))
    .sort((a, b) => {
      if (a.parsed && b.parsed) {
        if (a.parsed.year !== b.parsed.year) return b.parsed.year - a.parsed.year;
        if (a.parsed.month !== b.parsed.month) return a.parsed.month - b.parsed.month;
        return a.i - b.i;
      }
      if (a.parsed) return -1;
      if (b.parsed) return 1;
      return a.i - b.i;
    })
    .map((e) => e.link);
}

function buildTitle(fullName: string, country: string): string {
  return country ? `${fullName} (${country})` : fullName;
}

export async function exportLinksXlsx(params: ExportLinksXlsxParams): Promise<void> {
  const { fullName, country, keywords, links } = params;
  const mod = await import("exceljs");
  const ExcelJS = (mod as unknown as { default?: typeof mod }).default ?? mod;

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Hoja1");

  const widths = [14.8, 16.3, 15.1, 15.1, 176.4, 13.3, 14.8, 16.3, 135.0, 13.3];
  widths.forEach((w, i) => (ws.getColumn(i + 1).width = w));

  const highlight = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: HIGHLIGHT_ARGB },
  } as const;

  // Row 1: headers (A-E working zone, G-I presentation zone)
  const headers: Record<string, string> = {
    A1: "YEAR", B1: "MONTH", C1: "SEARCHENGINE", D1: "BLACKLIST", E1: "LINKS",
    G1: "YEAR", H1: "MONTH", I1: "LINKS",
  };
  for (const [ref, val] of Object.entries(headers)) ws.getCell(ref).value = val;
  for (const ref of ["G1", "H1", "I1"]) ws.getCell(ref).fill = highlight;

  const ordered = sortLinks(links);
  const lastRow = 4 + ordered.length;

  // Title / live count / keyword block, all centered in column E
  const titleCell = ws.getCell("E2");
  titleCell.value = buildTitle(fullName, country);
  titleCell.font = { name: "Calibri", bold: true, size: 28 };
  titleCell.alignment = { horizontal: "center" };

  const countCell = ws.getCell("E3");
  countCell.value = { formula: `COUNTA(E5:E${Math.max(lastRow, 5)})` };
  countCell.font = { name: "Calibri", bold: true, size: 16 };
  countCell.alignment = { horizontal: "center", vertical: "middle" };

  const kwCell = ws.getCell("E4");
  kwCell.value = `KEYWORDS: ${keywords.join(", ")}`;
  kwCell.font = { name: "Calibri", bold: true, size: 12 };
  kwCell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };

  for (const r of [2, 3, 4]) ws.getRow(r).height = 42.8;

  // Data rows: A-E raw working values, F-I mirrored/indexed formulas with highlight
  ordered.forEach((link, idx) => {
    const r = 5 + idx;
    const parsed = parseDate(link.date);

    ws.getCell(`A${r}`).value = parsed ? parsed.year : "NoData";
    if (parsed) ws.getCell(`B${r}`).value = MONTHS[parsed.month];

    const urlCell = ws.getCell(`E${r}`);
    urlCell.value = link.url;
    urlCell.font = { name: "Calibri", color: { argb: LINK_FONT_ARGB } };

    const fCell = ws.getCell(`F${r}`);
    fCell.value = { formula: `IF(E${r}<>"",ROWS($E$5:E${r}),"")` };
    fCell.fill = highlight;

    const gCell = ws.getCell(`G${r}`);
    gCell.value = { formula: `IF(A${r}="","",A${r})` };
    gCell.fill = highlight;

    const hCell = ws.getCell(`H${r}`);
    hCell.value = { formula: `IF(B${r}="","",B${r})` };
    hCell.fill = highlight;

    const iCell = ws.getCell(`I${r}`);
    iCell.value = { formula: `IF(E${r}="","",HYPERLINK(E${r},E${r}))` };
    iCell.font = { name: "Calibri", color: { argb: LINK_FONT_ARGB } };
    iCell.fill = highlight;
  });

  // Live duplicate highlight on column E (COUNTIF expression mirrors Excel's built-in rule)
  if (ordered.length > 0) {
    ws.addConditionalFormatting({
      ref: `E5:E${lastRow}`,
      rules: [
        {
          type: "expression",
          priority: 1,
          formulae: [`COUNTIF($E$5:$E$${lastRow},E5)>1`],
          style: {
            fill: { type: "pattern", pattern: "solid", bgColor: { argb: DUP_FILL_ARGB } },
            font: { color: { argb: DUP_FONT_ARGB } },
          },
        },
      ],
    });
  }

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${sanitize(fullName) || "scan"}-links.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
