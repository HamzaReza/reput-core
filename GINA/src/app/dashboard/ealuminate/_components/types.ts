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

export interface ScanResult {
  links: WebLink[];
  negative: WebLink[];
  positive: WebLink[];
  neutral: WebLink[];
  summary?: MeetingSummary;
}

export type RiskLevel = "Negative" | "Poor" | "Mediocre" | "Good";
export type KeywordFocus = "all" | "negative" | "neutral" | "positive";
