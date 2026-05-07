import type { PreAnalysisProfile, ScanResult } from "../_components/types";

interface ExportSummaryPdfParams {
  fullName: string;
  company: string;
  country: string;
  operatorName: string;
  score: number;
  result: ScanResult | null;
}

interface ExportReportMasterPdfParams {
  fullName: string;
  company: string;
  country: string;
  operatorName: string;
  preAnalysisProfile: PreAnalysisProfile | null;
  preAnalysisSummary: string;
  editableKeywords: string[];
}

function esc(v: string): string {
  return v
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function getDateStr(): string {
  return new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function scoreLabel(score: number): { label: string; color: string } {
  if (score >= 86) return { label: "Good", color: "#4CAF50" };
  if (score >= 61) return { label: "Mediocre", color: "#FFD600" };
  if (score >= 26) return { label: "Poor", color: "#FF8C00" };
  return { label: "Negative", color: "#FF6B4A" };
}

function riskLabel(risk: string): { label: string; color: string } {
  if (risk === "high") return { label: "Negative", color: "#FF6B4A" };
  if (risk === "medium") return { label: "Poor", color: "#FF8C00" };
  if (risk === "low") return { label: "Mediocre", color: "#FFD600" };
  return { label: "Good", color: "#4CAF50" };
}

function openPrintWindow(title: string): Window | null {
  const win = window.open("", "_blank");
  if (!win) return null;
  win.document.title = title;
  return win;
}

export function exportSummaryPdf(params: ExportSummaryPdfParams): void {
  const { fullName, company, country, operatorName, score, result } = params;
  const win = openPrintWindow("Ealuminate Report");
  if (!win) return;

  const dateStr = getDateStr();
  const sl = scoreLabel(score);
  const scoreColor =
    sl.label === "Good"
      ? "#4CAF50"
      : sl.label === "Mediocre"
        ? "#FFD600"
        : sl.label === "Poor"
          ? "#FF8C00"
          : "#FF6B4A";

  const briefHtml = result?.summary
    ? `
        <div class="brief-headline">${esc(result.summary.headline)}</div>
        ${
          result.summary.issues.length > 0
            ? `<div class="sub-head">Key Points</div>
               <ul class="brief-list">${result.summary.issues.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`
            : ""
        }
        ${
          result.summary.talkingPoints.length > 0
            ? `<div class="sub-head">Meeting Angles</div>
               <ol class="brief-list">${result.summary.talkingPoints.map((p) => `<li>${esc(p)}</li>`).join("")}</ol>`
            : ""
        }`
    : `<p style="color:#94a3b8;font-size:0.8125rem;">No meeting brief available.</p>`;

  const linksHtml =
    result?.links && result.links.length > 0
      ? result.links
          .map((link) => {
            const r = riskLabel(link.risk);
            const domain = (() => {
              try {
                return new URL(link.url).hostname.replace("www.", "");
              } catch {
                return link.source ?? "";
              }
            })();
            return `
            <div class="link-row">
              <div class="link-accent" style="background:${r.color};"></div>
              <div class="link-body">
                <div class="link-title">${esc(link.title || link.url)}</div>
                <div class="link-meta">
                  <span class="link-domain">${esc(domain)}</span>
                  <span class="link-sep">·</span>
                  <span class="link-risk" style="color:${r.color};">${r.label}</span>
                  ${link.date ? `<span class="link-sep">·</span><span class="link-domain">${esc(link.date)}</span>` : ""}
                </div>
                ${link.snippet ? `<div class="link-snippet">${esc(link.snippet)}</div>` : ""}
                <div class="link-url">${esc(link.url)}</div>
              </div>
            </div>`;
          })
          .join("")
      : `<p style="color:#94a3b8;font-size:0.8125rem;">No links available.</p>`;

  win.document.write(`<!DOCTYPE html><html lang="en"><head>
<meta charset="utf-8"/>
<title>Ealuminate Report — ${esc(fullName)}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
    background: #f0f4f8;
    color: #1e293b;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .page {
    width: 210mm;
    min-height: 297mm;
    margin: 0 auto;
    background: #ffffff;
    display: flex;
    flex-direction: column;
  }
  .header {
    background: #4479DA;
    padding: 2.5rem 2.5rem 2rem;
    text-align: center;
    position: relative;
    overflow: hidden;
  }
  .header::after {
    content: "";
    position: absolute;
    top: -40px; right: -40px;
    width: 200px; height: 200px;
    background: rgba(72,212,184,0.15);
    border-radius: 50%;
  }
  .header-logo-wrap {
    display: inline-block;
    background: #ffffff;
    padding: 0.625rem 1.5rem;
    border-radius: 0.375rem;
    margin-bottom: 1.5rem;
  }
  .header-logo { display: block; height: 48px; width: auto; }
  .header-eyebrow {
    font-size: 0.5625rem;
    font-weight: 700;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.65);
    margin-bottom: 0.5rem;
  }
  .header-title {
    font-size: 1rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.9);
  }
  .accent-bar {
    height: 3px;
    background: linear-gradient(90deg, #48D4B8 0%, #4479DA 100%);
  }
  .meta-strip {
    display: flex;
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
  }
  .meta-cell {
    flex: 1;
    padding: 0.75rem 1.25rem;
    border-right: 1px solid #e2e8f0;
  }
  .meta-cell:last-child { border-right: none; }
  .meta-label {
    font-size: 0.5625rem;
    font-weight: 700;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: #94a3b8;
    margin-bottom: 0.2rem;
  }
  .meta-value { font-size: 0.8125rem; font-weight: 600; color: #1e293b; }
  .body { padding: 2rem 2.5rem; flex: 1; }
  .section { margin-bottom: 2rem; }
  .section-head {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    padding-bottom: 0.625rem;
    margin-bottom: 1rem;
    border-bottom: 1px solid #e2e8f0;
  }
  .section-num { font-size: 0.5625rem; font-weight: 700; letter-spacing: 0.15em; color: #48D4B8; }
  .section-name { font-size: 0.625rem; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: #64748b; }
  .badge {
    margin-left: auto;
    padding: 0.2rem 0.625rem;
    background: rgba(255,61,0,0.07);
    border: 1px solid rgba(255,61,0,0.18);
    color: #FF6B4A;
    font-size: 0.5rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }
  .score-block {
    display: flex;
    align-items: center;
    gap: 2rem;
    padding: 1.25rem 1.5rem;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-left: 4px solid ${scoreColor};
  }
  .score-num {
    font-size: 3rem;
    font-weight: 800;
    color: ${scoreColor};
    line-height: 1;
    flex-shrink: 0;
  }
  .score-label {
    font-size: 0.625rem;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: ${scoreColor};
    margin-bottom: 0.375rem;
  }
  .score-desc { font-size: 0.8125rem; color: #64748b; line-height: 1.5; }
  .brief-headline { font-size: 0.9375rem; font-weight: 700; color: #1e293b; margin-bottom: 1rem; line-height: 1.4; }
  .sub-head {
    font-size: 0.5625rem;
    font-weight: 700;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: #94a3b8;
    margin: 0.875rem 0 0.375rem;
  }
  .brief-list { padding-left: 1.1rem; }
  .brief-list li { font-size: 0.8125rem; color: #475569; line-height: 1.55; margin-bottom: 0.35rem; }
  .link-row {
    display: flex;
    border: 1px solid #e2e8f0;
    margin-bottom: 0.625rem;
    overflow: hidden;
  }
  .link-accent { width: 4px; flex-shrink: 0; }
  .link-body { flex: 1; padding: 0.625rem 0.875rem; min-width: 0; }
  .link-title { font-size: 0.875rem; font-weight: 600; color: #1e293b; margin-bottom: 0.25rem; line-height: 1.35; }
  .link-meta { display: flex; align-items: center; gap: 0.375rem; margin-bottom: 0.25rem; }
  .link-domain { font-size: 0.6875rem; color: #94a3b8; }
  .link-sep { font-size: 0.6875rem; color: #cbd5e1; }
  .link-risk { font-size: 0.6875rem; font-weight: 600; }
  .link-snippet { font-size: 0.75rem; color: #64748b; line-height: 1.55; margin-bottom: 0.25rem; }
  .link-url { font-size: 0.6rem; color: #94a3b8; word-break: break-all; }
  .footer {
    padding: 0.875rem 2.5rem;
    border-top: 1px solid #e2e8f0;
    background: #f8fafc;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .footer-brand { font-size: 0.5625rem; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; color: #94a3b8; }
  .footer-date { font-size: 0.6875rem; color: #94a3b8; }
  @media print {
    body { background: #ffffff; }
    .page { margin: 0; width: 100%; }
    @page { margin: 0; size: A4; }
  }
</style>
</head><body>
<div class="page">
  <div class="header">
    <div class="header-logo-wrap">
      <img class="header-logo" src="${window.location.origin}/images/Ealixir.png" alt="Ealixir"/>
    </div>
    <div class="header-eyebrow">Ealuminate Intelligence Module</div>
    <div class="header-title">Ealuminate Report</div>
  </div>
  <div class="accent-bar"></div>
  <div class="meta-strip">
    <div class="meta-cell"><div class="meta-label">Subject</div><div class="meta-value">${esc(fullName)}</div></div>
    ${company ? `<div class="meta-cell"><div class="meta-label">Company</div><div class="meta-value">${esc(company)}</div></div>` : ""}
    ${country ? `<div class="meta-cell"><div class="meta-label">Country</div><div class="meta-value">${esc(country)}</div></div>` : ""}
    ${operatorName ? `<div class="meta-cell"><div class="meta-label">Prepared by</div><div class="meta-value">${esc(operatorName)}</div></div>` : ""}
    <div class="meta-cell"><div class="meta-label">Generated</div><div class="meta-value">${esc(dateStr)}</div></div>
  </div>
  <div class="body">
    <div class="section">
      <div class="section-head">
        <span class="section-num">01</span>
        <span class="section-name">Reputation Score</span>
      </div>
      <div class="score-block">
        <div class="score-num">${score}</div>
        <div>
          <div class="score-label">${esc(sl.label)}</div>
          <div class="score-desc">
            ${sl.label === "Good" ? "No significant adverse findings. Subject presents a positive public profile." : sl.label === "Mediocre" ? "Some mixed signals detected. Review findings before proceeding." : sl.label === "Poor" ? "Notable adverse findings. Exercise caution and review sources carefully." : "Significant adverse findings detected. High reputational risk identified."}
          </div>
        </div>
      </div>
    </div>
    <div class="section">
      <div class="section-head">
        <span class="section-num">02</span>
        <span class="section-name">Internal Meeting Brief</span>
        <span class="badge">Internal Only</span>
      </div>
      ${briefHtml}
    </div>
    <div class="section">
      <div class="section-head">
        <span class="section-num">03</span>
        <span class="section-name">Source Intelligence</span>
      </div>
      ${linksHtml}
    </div>
  </div>
  <div class="footer">
    <span class="footer-brand">Ealuminate &nbsp;·&nbsp; Ealixir &nbsp;·&nbsp; Confidential &amp; Proprietary</span>
    <span class="footer-date">${esc(dateStr)}</span>
  </div>
</div>
</body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 400);
}

export function exportReportMasterPdf(params: ExportReportMasterPdfParams): void {
  const {
    fullName,
    company,
    country,
    operatorName,
    preAnalysisProfile,
    preAnalysisSummary,
    editableKeywords,
  } = params;
  const win = openPrintWindow("Report Master");
  if (!win) return;
  const dateStr = getDateStr();

  const profileRows = preAnalysisProfile
    ? [
        ["Identity", preAnalysisProfile.identity],
        ["Background", preAnalysisProfile.background],
        ["Negative Findings", preAnalysisProfile.negative_findings],
        ["Positive Presence", preAnalysisProfile.positive_presence],
        ["Reputation Notes", preAnalysisProfile.reputation_notes],
      ]
        .map(
          ([label, text]) => `
          <div class="profile-field">
            <div class="field-label">${esc(label)}</div>
            <div class="field-value">${esc(text)}</div>
          </div>`,
        )
        .join("")
    : `<div class="profile-field full"><div class="field-value">${esc(preAnalysisSummary || "No profile available.")}</div></div>`;

  const keywordPills =
    editableKeywords.length > 0
      ? editableKeywords.map((kw) => `<span class="kw-pill">${esc(kw)}</span>`).join("")
      : `<span style="color:#94a3b8;font-size:0.8125rem;">No keywords.</span>`;

  win.document.write(`<!DOCTYPE html><html lang="en"><head>
<meta charset="utf-8"/>
<title>Report Master — ${esc(fullName)}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
    background: #f0f4f8;
    color: #1e293b;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .page {
    width: 210mm;
    min-height: 297mm;
    margin: 0 auto;
    background: #ffffff;
    display: flex;
    flex-direction: column;
  }
  .header {
    background: #4479DA;
    padding: 2.5rem 2.5rem 2rem;
    color: #fff;
    position: relative;
    overflow: hidden;
    text-align: center;
  }
  .header::after {
    content: "";
    position: absolute;
    top: -40px; right: -40px;
    width: 200px; height: 200px;
    background: rgba(72,212,184,0.15);
    border-radius: 50%;
  }
  .header-logo-wrap {
    display: inline-block;
    background: #ffffff;
    padding: 0.625rem;
    border-radius: 0.375rem;
    margin-bottom: 1.5rem;
  }
  .header-logo {
    display: block;
    height: 60px;
    width: auto;
  }
  .header-eyebrow {
    font-size: 0.5625rem;
    font-weight: 700;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.65);
    margin-bottom: 0.5rem;
  }
  .header-title {
    font-size: 1rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.9);
  }
  .accent-bar {
    height: 3px;
    background: linear-gradient(90deg, #48D4B8 0%, #4479DA 100%);
  }
  .meta-strip {
    display: flex;
    gap: 0;
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
  }
  .meta-cell {
    flex: 1;
    padding: 0.75rem 1.25rem;
    border-right: 1px solid #e2e8f0;
  }
  .meta-cell:last-child { border-right: none; }
  .meta-label {
    font-size: 0.5625rem;
    font-weight: 700;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: #94a3b8;
    margin-bottom: 0.2rem;
  }
  .meta-value {
    font-size: 0.8125rem;
    font-weight: 600;
    color: #1e293b;
  }
  .body { padding: 2rem 2.5rem; flex: 1; }
  .section { margin-bottom: 2rem; }
  .section-head {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    padding-bottom: 0.625rem;
    margin-bottom: 1rem;
    border-bottom: 1px solid #e2e8f0;
  }
  .section-num {
    font-size: 0.5625rem;
    font-weight: 700;
    letter-spacing: 0.15em;
    color: #48D4B8;
  }
  .section-name {
    font-size: 0.625rem;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: #64748b;
  }
  .badge {
    margin-left: auto;
    padding: 0.2rem 0.625rem;
    background: rgba(255,61,0,0.07);
    border: 1px solid rgba(255,61,0,0.18);
    color: #FF6B4A;
    font-size: 0.5rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }
  .profile-grid { display: flex; flex-direction: column; gap: 0.75rem; }
  .profile-field {
    padding: 0.875rem 1rem;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-left: 3px solid #4479DA;
  }
  .profile-field.full { grid-column: span 2; }
  .field-label {
    font-size: 0.5625rem;
    font-weight: 700;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: #94a3b8;
    margin-bottom: 0.35rem;
  }
  .field-value {
    font-size: 0.8125rem;
    color: #334155;
    line-height: 1.65;
  }
  .kw-list { display: flex; flex-wrap: wrap; gap: 0.5rem; }
  .kw-pill {
    padding: 0.375rem 0.875rem;
    background: rgba(68,121,218,0.07);
    border: 1px solid rgba(68,121,218,0.22);
    color: #4479DA;
    font-size: 0.8125rem;
    font-weight: 600;
    letter-spacing: 0.02em;
  }
  .footer {
    padding: 0.875rem 2.5rem;
    border-top: 1px solid #e2e8f0;
    background: #f8fafc;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .footer-brand {
    font-size: 0.5625rem;
    font-weight: 700;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: #94a3b8;
  }
  .footer-date { font-size: 0.6875rem; color: #94a3b8; }
  @media print {
    body { background: #ffffff; }
    .page { margin: 0; width: 100%; }
    @page { margin: 0; size: A4; }
  }
</style>
</head><body>
<div class="page">
  <div class="header">
    <div class="header-logo-wrap">
      <img class="header-logo" src="${window.location.origin}/images/Ealixir.png" alt="Ealixir"/>
    </div>
    <div class="header-eyebrow">Ealuminate Intelligence Module</div>
    <div class="header-title">Report Master</div>
  </div>
  <div class="accent-bar"></div>
  <div class="meta-strip">
    <div class="meta-cell"><div class="meta-label">Subject</div><div class="meta-value">${esc(fullName)}</div></div>
    ${company ? `<div class="meta-cell"><div class="meta-label">Company</div><div class="meta-value">${esc(company)}</div></div>` : ""}
    ${country ? `<div class="meta-cell"><div class="meta-label">Country</div><div class="meta-value">${esc(country)}</div></div>` : ""}
    ${operatorName ? `<div class="meta-cell"><div class="meta-label">Prepared by</div><div class="meta-value">${esc(operatorName)}</div></div>` : ""}
    <div class="meta-cell"><div class="meta-label">Generated</div><div class="meta-value">${esc(dateStr)}</div></div>
  </div>
  <div class="body">
    <div class="section">
      <div class="section-head">
        <span class="section-num">01</span>
        <span class="section-name">Research Profile</span>
        <span class="badge">Confidential</span>
      </div>
      <div class="profile-grid">${profileRows}</div>
    </div>
    <div class="section">
      <div class="section-head">
        <span class="section-num">02</span>
        <span class="section-name">Search Keywords</span>
      </div>
      <div class="kw-list">${keywordPills}</div>
    </div>
  </div>
  <div class="footer">
    <span class="footer-brand">Ealuminate &nbsp;·&nbsp; Ealixir &nbsp;·&nbsp; Confidential &amp; Proprietary</span>
    <span class="footer-date">${esc(dateStr)}</span>
  </div>
</div>
</body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 400);
}
