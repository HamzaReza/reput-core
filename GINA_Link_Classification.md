# GINA — Link Classification System

This document explains how GINA automatically classifies web links found during a reputation scan.

---

## The Four Labels

Every link found during a scan is assigned one of four labels:

| Label | Color | Meaning |
|---|---|---|
| **Good** | Green | Positive or purely informational content |
| **Mediocre** | Yellow | Minor or weak negative mentions |
| **Poor** | Orange | Controversies, allegations, or complaints |
| **Negative** | Red | Crimes, fraud, lawsuits, investigations |

---

## How a Link Gets Classified

### 1. AI Reads the Link

Each link is analyzed by Claude AI, which reads the article and answers two questions:

**What is the sentiment?**
- `Negative` — content that damages reputation
- `Positive` — content that helps reputation
- `Neutral` — purely informational, no reputational impact

**What is the risk level?**
- `High` — crimes, fraud, lawsuits, investigations, illegal activity
- `Medium` — accidents, controversies, allegations, complaints
- `Low` — minor criticism or weak negative mentions
- `None` — positive or neutral content

---

### 2. Risk Level Maps to a Label

| AI Risk Level | Label Shown |
|---|---|
| High | **Negative** (Red) |
| Medium | **Poor** (Orange) |
| Low | **Mediocre** (Yellow) |
| None | **Good** (Green) |

---

### 3. The Exact Prompt Sent to Claude AI

Below is the verbatim prompt the system sends to Claude for every batch of links. Variables in `[brackets]` are filled in dynamically per scan.

```
You are a reputation intelligence analyst. Classify the following [N] articles about "[Subject Name]".

[If countries provided]:
  The subject is from [Countries]. Only include results clearly relevant to this person and these regions.

Search context keywords used: [keywords]

CLASSIFICATION RULES:

NEGATIVE sentiment — classify if the article contains ANY of:
- Criminal investigations, police involvement, charges, arrests
- Lawsuits, legal disputes, court cases, regulatory sanctions
- Fraud, scams, financial misconduct
- Accusations, allegations, or suspicion of wrongdoing
- Controversies, scandals, or reputation-damaging incidents
- Accidents or incidents involving the subject
- WHEN IN DOUBT between negative and neutral → choose NEGATIVE

POSITIVE sentiment — classify if the article CLEARLY shows:
- Awards, honors, recognitions
- Major achievements or business/professional success
- Leadership appointments or promotions
- Strong positive media coverage praising the person

NEUTRAL sentiment — ONLY if:
- Purely informational (Wikipedia entry, directory listing, company profile)
- ZERO reputational concern whatsoever
- No legal mentions, no incidents, no controversy

RISK CLASSIFICATION:
- "high":   crimes, fraud, lawsuits, investigations, illegal activity
- "medium": accidents, controversies, allegations, complaints
- "low":    minor criticism or weak negative mentions
- "none":   positive or neutral content

MANDATORY NAME FILTER:
Before classifying, check whether the subject "[Name]" is clearly identifiable
in the title, snippet, or content.

INCLUDE the article if:
• The full name "[Name]" appears (case-insensitive), OR
• Both "[First]" AND "[Last]" appear in close proximity

EXCLUDE the article if:
• Only the first name appears without the last name, OR
• Only the last name appears without the first name, OR
• The article is clearly about a different person with a similar name, OR
• Neither appears at all

If EXCLUDED → do not include this article in the output at all.
```

> **Note:** Claude also generates a 3-sentence plain-English summary of each link's reputational significance — written in its own words, not copied from the source.

---

### 4. What Triggers Each Classification

#### Negative / Poor
The AI flags a link as negative when it finds any of the following:

- Criminal investigations, police involvement, arrests, or charges
- Lawsuits, legal disputes, court cases, or regulatory sanctions
- Fraud, scams, or financial misconduct
- Accusations, allegations, or suspicions of wrongdoing
- Controversies, scandals, or reputation-damaging incidents
- Accidents or incidents directly involving the subject

> **Default rule:** When in doubt, the AI defaults to classifying a link as **Negative** to err on the side of caution.

#### Good
The AI flags a link as positive when it finds:

- Awards, honors, or recognitions
- Major business or professional achievements
- Leadership appointments or promotions
- Strong positive media coverage

#### Mediocre / Good (Neutral)
The AI treats a link as neutral when:

- It is purely informational (e.g., Wikipedia, directory listings, company profiles)
- There is zero reputational concern — no legal mentions, no incidents, no controversy

---

## How the Overall Score Is Calculated

Each person or entity gets an overall reputation score from **0 to 100**, calculated from the total number of negative and positive links found.

| Negative Links Found | Score Range |
|---|---|
| 0 | 86 – 100 |
| 1 – 5 | 61 – 85 |
| 6 – 10 | 26 – 60 |
| 11 or more | 0 – 25 |

Positive links add a small bonus (up to +5 points) within each band.

---

## Score → Final Rating

| Score | Rating |
|---|---|
| 86 – 100 | **Good** |
| 61 – 85 | **Mediocre** |
| 26 – 60 | **Poor** |
| 0 – 25 | **Negative** |

---

## Example

A scan finds 3 negative links (a lawsuit article, an allegation mention) and 8 positive links (awards, business profile):

1. Each negative link is classified as `High` or `Medium` risk → labeled **Negative** or **Poor**
2. Positive links are labeled **Good**
3. Score calculation: 3 negatives → base range 61–85, positive bonus adds ~4 pts → **Score: ~77**
4. Final rating: **Mediocre**

---

## Can the Classification Be Adjusted?

Yes. The following can be tuned:

| What | How |
|---|---|
| What counts as negative/positive | Edit the AI prompt rules |
| Score cutoffs (e.g., raise the bar for "Good") | Edit the score threshold values |
| Risk-to-label mapping | Edit the risk mapping logic |

Please contact the development team to request adjustments.

---

*Generated by the GINA development team — May 2026*
