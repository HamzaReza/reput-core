import type { WebLink } from "@/lib/api";

export interface PreAnalysisProfile {
  identity: string;
  background: string;
  negative_findings: string;
  positive_presence: string;
  reputation_notes: string;
}

export interface MeetingSummary {
  headline: string;
  issues: string[];
  talkingPoints: string[];
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
