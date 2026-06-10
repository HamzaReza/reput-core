import type { WebLink } from "@/lib/api";

export interface PreAnalysisProfile {
  identity: string;
  background: string;
  associations?: string;
  recent_news?: string;
  negative_findings: string;
  positive_presence: string;
  reputation_notes: string;
  estimated_negative_links?: {
    low: number;
    high: number;
    reasoning: string;
    coverage_assessment?: "minimal" | "moderate" | "substantial" | "extensive";
    confidence?: "low" | "medium" | "high";
    distinct_negative_sources_seen?: number;
    saturation?: "saturated" | "unsaturated" | "unknown";
  };
}

export interface MeetingSummary {
  headline: string;
  issues: string[];
  talkingPoints: string[];
  riskIndicators?: string[];
  objectionHandlers?: string[];
}

export interface ScanLogSerperQuery {
  keyword: string | null;
  query: string;
  country: string | null;
  pages: number;
  count: number;
  links: string[];
}

export interface ScanLog {
  serper?: {
    queries: ScanLogSerperQuery[];
    totalRaw: number;
    deduped?: { count: number; links: string[] };
  };
  prefilter?: {
    count: number;
    dropped: { url: string; reason: string }[];
  };
  firecrawl?: {
    skipped: {
      count: number;
      youtube: number;
      pdf: number;
      noApiKey: number;
      links: { url: string; reason: string }[];
    };
    success: { count: number; links: string[] };
    failed: { count: number; links: string[] };
    notAttempted: { count: number; links: string[] };
    error: string | null;
  };
  nameFilter?: {
    firstName: string;
    lastName: string;
    keptCount: number;
    dropped: {
      count: number;
      articles: { url: string; title: string; snippet: string; content: string }[];
    };
  };
  companyNameFilter?: {
    searchSubject: string;
    matchTokens: string[];
    abbreviations?: string[];
    keptCount: number;
    dropped: {
      count: number;
      articles: { url: string; title: string; snippet: string }[];
    };
  };
  claude?: {
    model: string;
    scanFocus: string | null;
    batches: {
      batch: number;
      sentCount: number;
      sent: string[];
      returnedCount: number;
      returned: {
        url: string | null;
        sentiment: string | null;
        risk: string | null;
      }[];
    }[];
    dropped: { count: number; links: string[] };
  };
}

export interface ScanResult {
  links: WebLink[];
  negative: WebLink[];
  positive: WebLink[];
  neutral: WebLink[];
  summary?: MeetingSummary;
  scanLog?: ScanLog;
}

export type RiskLevel = "Negative" | "Poor" | "Mediocre" | "Good";
export type KeywordFocus = "all" | "negative" | "neutral" | "positive";
