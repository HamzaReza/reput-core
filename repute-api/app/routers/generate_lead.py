import asyncio
import json
import math
import re
import unicodedata
import uuid
from datetime import datetime, timezone
from typing import Literal

import anthropic
import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import AsyncSessionLocal, get_db
from app.models.lead import GenerateLeadJob, WebAnalyst
from app.utils.auth import get_current_web_analyst

router = APIRouter(prefix="/generate-lead", tags=["generate-lead"])

_background_tasks: set[asyncio.Task] = set()

# ── Lookup tables ────────────────────────────────────────────────────────────

NATIONALITY_ALIASES: dict[str, str] = {
    "afghan": "AF",
    "albanian": "AL",
    "algerian": "DZ",
    "american": "US",
    "argentine": "AR",
    "australian": "AU",
    "austrian": "AT",
    "belgian": "BE",
    "brazilian": "BR",
    "british": "GB",
    "bulgarian": "BG",
    "canadian": "CA",
    "chilean": "CL",
    "chinese": "CN",
    "colombian": "CO",
    "croatian": "HR",
    "czech": "CZ",
    "danish": "DK",
    "dutch": "NL",
    "egyptian": "EG",
    "emirati": "AE",
    "finnish": "FI",
    "french": "FR",
    "german": "DE",
    "greek": "GR",
    "hungarian": "HU",
    "indian": "IN",
    "indonesian": "ID",
    "iranian": "IR",
    "iraqi": "IQ",
    "irish": "IE",
    "israeli": "IL",
    "italian": "IT",
    "japanese": "JP",
    "jordanian": "JO",
    "kenyan": "KE",
    "korean": "KR",
    "lebanese": "LB",
    "malaysian": "MY",
    "mexican": "MX",
    "moroccan": "MA",
    "new zealander": "NZ",
    "nigerian": "NG",
    "norwegian": "NO",
    "pakistani": "PK",
    "peruvian": "PE",
    "philippine": "PH",
    "polish": "PL",
    "portuguese": "PT",
    "romanian": "RO",
    "russian": "RU",
    "saudi": "SA",
    "serbian": "RS",
    "singaporean": "SG",
    "south african": "ZA",
    "spanish": "ES",
    "swedish": "SE",
    "swiss": "CH",
    "thai": "TH",
    "turkish": "TR",
    "ukranian": "UA",
    "ukrainian": "UA",
    "venezuelan": "VE",
    "vietnamese": "VN",
    "netherlands": "NL",
    "czech republic": "CZ",
    "uae": "AE",
    "uk": "GB",
    "united kingdom": "GB",
    "usa": "US",
    "united states": "US",
    "south korea": "KR",
    "turkiye": "TR",
    "turkey": "TR",
    "taiwan": "TW",
    "vietnam": "VN",
    "philippines": "PH",
    "iran": "IR",
    "russia": "RU",
    "syria": "SY",
    "venezuela": "VE",
    "bolivia": "BO",
    "moldova": "MD",
    "tanzania": "TZ",
    "laos": "LA",
    "north korea": "KP",
    "micronesia": "FM",
    "palestine": "PS",
    "ethiopia": "ET",
    "ghana": "GH",
    "senegal": "SN",
}

_COUNTRY_TO_LANGUAGE: dict[str, str] = {
    # Europe
    "AL": "sq",
    "AD": "ca",
    "AT": "de",
    "BY": "be",
    "BE": "fr",
    "BA": "bs",
    "BG": "bg",
    "HR": "hr",
    "CY": "el",
    "CZ": "cs",
    "DK": "da",
    "EE": "et",
    "FI": "fi",
    "FR": "fr",
    "DE": "de",
    "GR": "el",
    "HU": "hu",
    "IS": "is",
    "IE": "en",
    "IT": "it",
    "XK": "sq",
    "LV": "lv",
    "LI": "de",
    "LT": "lt",
    "LU": "fr",
    "MK": "mk",
    "MT": "mt",
    "MD": "mo",
    "MC": "fr",
    "ME": "sr-me",
    "NL": "nl",
    "NO": "no",
    "PL": "pl",
    "PT": "pt",
    "RO": "ro",
    "RU": "ru",
    "SM": "it",
    "RS": "sr",
    "SK": "sk",
    "SI": "sl",
    "ES": "es",
    "SE": "sv",
    "CH": "de",
    "UA": "uk",
    "GB": "en",
    "VA": "it",
    # Americas
    "AG": "en",
    "AR": "es",
    "AW": "nl",
    "BS": "en",
    "BB": "en",
    "BZ": "en",
    "BO": "es",
    "BR": "pt-br",
    "CA": "en",
    "CL": "es",
    "CO": "es",
    "CR": "es",
    "CU": "es",
    "DM": "en",
    "DO": "es",
    "EC": "es",
    "SV": "es",
    "GD": "en",
    "GT": "es",
    "GY": "en",
    "HT": "ht",
    "HN": "es",
    "JM": "en",
    "MX": "es",
    "NI": "es",
    "PA": "es",
    "PY": "es",
    "PE": "es",
    "KN": "en",
    "LC": "en",
    "VC": "en",
    "SR": "nl",
    "TT": "en",
    "US": "en",
    "UY": "es",
    "VE": "es",
    # Middle East / North Africa
    "DZ": "ar",
    "BH": "ar",
    "EG": "ar",
    "IQ": "ar",
    "JO": "ar",
    "KW": "ar",
    "LB": "ar",
    "LY": "ar",
    "MA": "ar",
    "OM": "ar",
    "PS": "ar",
    "QA": "ar",
    "SA": "ar",
    "SD": "ar",
    "SY": "ar",
    "TN": "ar",
    "AE": "ar",
    "YE": "ar",
    "IL": "iw",
    "IR": "fa",
    "TR": "tr",
    # Sub-Saharan Africa
    "AO": "pt",
    "BJ": "fr",
    "BW": "en",
    "BF": "fr",
    "BI": "fr",
    "CM": "fr",
    "CV": "pt",
    "CF": "fr",
    "TD": "fr",
    "KM": "fr",
    "CG": "fr",
    "CD": "fr",
    "CI": "fr",
    "DJ": "fr",
    "GQ": "es",
    "ER": "ti",
    "ET": "am",
    "GA": "fr",
    "GM": "en",
    "GH": "en",
    "GN": "fr",
    "GW": "pt",
    "KE": "sw",
    "LS": "st",
    "LR": "en",
    "MG": "mg",
    "MW": "ny",
    "ML": "fr",
    "MR": "ar",
    "MU": "fr",
    "MZ": "pt",
    "NA": "af",
    "NE": "fr",
    "NG": "en",
    "RW": "rw",
    "ST": "pt",
    "SN": "fr",
    "SC": "fr",
    "SL": "en",
    "SO": "so",
    "ZA": "af",
    "SS": "en",
    "TZ": "sw",
    "TG": "fr",
    "UG": "en",
    "ZM": "en",
    "ZW": "en",
    # Asia
    "AF": "ps",
    "AM": "hy",
    "AZ": "az",
    "BD": "bn",
    "BT": "bt",
    "KH": "km",
    "CN": "zh-cn",
    "GE": "ka",
    "IN": "hi",
    "ID": "id",
    "JP": "ja",
    "KZ": "kk",
    "KG": "ky",
    "LA": "lo",
    "MY": "ms",
    "MV": "mv",
    "MN": "mn",
    "MM": "my",
    "NP": "ne",
    "KR": "ko",
    "LK": "si",
    "TJ": "tg",
    "TH": "th",
    "TM": "tk",
    "TW": "zh-tw",
    "UZ": "uz",
    "VN": "vi",
    "PK": "ur",
    "PH": "tl",
    "SG": "en",
    "HK": "zh-tw",
    # Oceania
    "AU": "en",
    "FJ": "en",
    "NZ": "en",
    "PG": "en",
    "WS": "ws",
    "TO": "to",
}


def _get_serper_locale(country_code: str | None) -> tuple[str | None, str]:
    """Return (gl, hl) for a Serper request. hl defaults to 'en' if unmapped."""
    if not country_code:
        return None, "en"
    upper = country_code.upper()
    return upper.lower(), _COUNTRY_TO_LANGUAGE.get(upper, "en")


LANG_CODE_TO_NAME: dict[str, str] = {
    "en": "English",
    "it": "Italian",
    "es": "Spanish",
    "fr": "French",
    "de": "German",
    "pt": "Portuguese",
    "pt-br": "Portuguese",
    "nl": "Dutch",
    "pl": "Polish",
    "ro": "Romanian",
    "hu": "Hungarian",
    "cs": "Czech",
    "ru": "Russian",
    "uk": "Ukrainian",
    "tr": "Turkish",
    "ja": "Japanese",
    "ko": "Korean",
    "zh-cn": "Chinese",
    "zh-tw": "Chinese",
    "ar": "Arabic",
    "hi": "Hindi",
    "th": "Thai",
    "vi": "Vietnamese",
    "id": "Indonesian",
    "ms": "Malay",
    "el": "Greek",
    "sv": "Swedish",
    "no": "Norwegian",
    "fi": "Finnish",
    "da": "Danish",
}

REPORT_LANG_MAP: dict[str, str] = {"en": "English", "it": "Italian", "es": "Spanish"}

MONTH_MAP: dict[str, int] = {
    "jan": 1,
    "feb": 2,
    "mar": 3,
    "apr": 4,
    "may": 5,
    "jun": 6,
    "jul": 7,
    "aug": 8,
    "sep": 9,
    "oct": 10,
    "nov": 11,
    "dec": 12,
    "gen": 1,
    "mag": 5,
    "giu": 6,
    "lug": 7,
    "ago": 8,
    "set": 9,
    "ott": 10,
    "dic": 12,
    "ene": 1,
    "abr": 4,
    "fév": 2,
    "avr": 4,
    "aoû": 8,
    "mär": 3,
    "okt": 10,
    "fev": 2,
    "out": 10,
}


# ── Helpers ──────────────────────────────────────────────────────────────────


def _country_code(country: str) -> str | None:
    k = country.lower().strip()
    return NATIONALITY_ALIASES.get(k)


def _parse_serper_date(date_str: str) -> float:
    try:
        return datetime.fromisoformat(date_str).timestamp()
    except ValueError:
        pass
    # "Dec 7, 2023" or "December 7, 2023" — Serper's actual format
    for fmt in ("%b %d, %Y", "%B %d, %Y"):
        try:
            return datetime.strptime(date_str.strip(), fmt).timestamp()
        except ValueError:
            pass
    m = re.match(
        r"^(\d{1,2})\s+([a-záàâäéèêëíìîïóòôöúùûüñç]+)\.?\s+(\d{4})$",
        date_str.strip(),
        re.IGNORECASE,
    )
    if m:
        month = MONTH_MAP.get(m.group(2).lower())
        if month:
            try:
                return datetime(int(m.group(3)), month, int(m.group(1))).timestamp()
            except ValueError:
                pass
    return float("nan")


def _dedupe_links(links: list[dict]) -> list[dict]:
    sentiment_priority = {"negative": 3, "neutral": 2, "positive": 1}
    risk_priority = {"high": 4, "medium": 3, "low": 2, "none": 1}
    seen: dict[str, dict] = {}
    for link in links:
        url = link["url"]
        if url not in seen:
            seen[url] = link
            continue
        existing = seen[url]
        existing_score = sentiment_priority.get(
            existing.get("sentiment", "neutral"), 2
        ) * 10 + risk_priority.get(existing.get("risk", "none"), 1)
        new_score = sentiment_priority.get(
            link.get("sentiment", "neutral"), 2
        ) * 10 + risk_priority.get(link.get("risk", "none"), 1)
        if new_score > existing_score:
            seen[url] = link
    return list(seen.values())


def _strip_diacritics(s: str) -> str:
    return "".join(
        c
        for c in unicodedata.normalize("NFKD", s.lower())
        if not unicodedata.combining(c)
    )


_NAME_PARTICLES = {
    "the", "and", "del", "di", "de", "von", "van", "el", "da", "do", "das", "dos",
    "la", "le", "les", "bin", "bint",
}


def _passes_name_filter(article: dict, first_name: str, last_name: str) -> bool:
    raw = " ".join([
        article.get("title", ""),
        article.get("snippet", ""),
        article.get("content", ""),
    ])
    text = _strip_diacritics(raw)
    first = _strip_diacritics(first_name)
    last = _strip_diacritics(last_name)

    if f"{first} {last}" in text or f"{last} {first}" in text:
        return True

    # Check hyphenated compound surnames e.g. "GASPAR-BARRIOS" → finds "barrios"
    for match in re.findall(rf"\b(\w+)-{re.escape(last)}\b|\b{re.escape(last)}-(\w+)\b", text):
        found = (match[0] or match[1]).lower()
        if len(found) > 2 and found not in _NAME_PARTICLES:
            if found != first and found not in first and first not in found:
                return False

    # Check space-separated adjacent words
    for match in re.findall(rf"\b(\w+)\s+{re.escape(last)}\b|\b{re.escape(last)}\s+(\w+)\b", text):
        found = (match[0] or match[1]).lower()
        if len(found) <= 2:
            continue
        if found in _NAME_PARTICLES:
            continue
        if found != first and found not in first and first not in found:
            return False

    return True


def _derive_score(neg_count: int, pos_count: int) -> int:
    if neg_count == 0:
        if pos_count >= 10:
            return 100
        return 86 + round((pos_count / 9) * 13)
    if neg_count <= 5:
        base = 85 - (neg_count - 1) * 4
        return min(85, max(61, base + round((min(pos_count, 10) / 10) * 5)))
    if neg_count <= 10:
        base = 60 - (neg_count - 6) * 7
        return min(60, max(26, base + round((min(pos_count, 10) / 10) * 5)))
    return max(0, 25 - (neg_count - 11) * 2)


def _fallback_summary(score: int) -> dict:
    headline = (
        "Clean profile — low urgency"
        if score >= 86
        else (
            "Some concerns — moderate priority"
            if score >= 61
            else "Significant issues — high priority"
        )
    )
    return {
        "headline": headline,
        "issues": ["Summary unavailable"],
        "talkingPoints": [
            "Discuss their current online presence",
            "Highlight risks of unmanaged reputation",
        ],
        "riskIndicators": [],
        "objectionHandlers": [],
    }


async def _is_pdf(url: str, http: httpx.AsyncClient) -> bool:
    """
    Detect if a URL points to a PDF file.

    Strategy:
    1. Check URL for .pdf extension (fastest, no network)
    2. Make HEAD request to check Content-Type headers
    3. Return False on error (assume it's not a PDF, allow scraping)
    """
    url_lower = url.lower()

    # Quick check: .pdf in URL path (before query string)
    if ".pdf" in url_lower.split("?")[0]:
        print(f"[_is_pdf] Filtered PDF by URL pattern: {url}")
        return True

    try:
        # Use HEAD request (lightweight) instead of GET
        response = await http.head(
            url,
            timeout=3.0,
            follow_redirects=True,
        )

        content_type = response.headers.get("content-type", "").lower()
        content_disp = response.headers.get("content-disposition", "").lower()

        # Check Content-Type header
        if "application/pdf" in content_type:
            print(f"[_is_pdf] Filtered PDF by Content-Type header: {url}")
            return True

        # Check Content-Disposition header (for file downloads)
        if ".pdf" in content_disp:
            print(f"[_is_pdf] Filtered PDF by Content-Disposition header: {url}")
            return True

        # Some servers use non-standard MIME types
        if "pdf" in content_type:
            print(f"[_is_pdf] Filtered PDF by 'pdf' in Content-Type: {url}")
            return True

        return False

    except asyncio.TimeoutError:
        print(
            f"[_is_pdf] Timeout on HEAD request for {url}, allowing scraping (assuming not PDF)"
        )
        return False
    except httpx.RequestError as e:
        print(
            f"[_is_pdf] Network error checking {url}: {type(e).__name__}, allowing scraping"
        )
        return False
    except Exception as e:
        print(
            f"[_is_pdf] Unexpected error checking {url}: {type(e).__name__}, allowing scraping"
        )
        return False


async def _search_serper(
    query: str,
    country_code: str | None,
    language_code: str | None,
    num_pages: int,
    serper_key: str,
    http: httpx.AsyncClient,
) -> tuple[list[dict], list[dict], int]:
    def make_payload(page: int) -> dict:
        payload: dict = {"q": query, "page": page}
        gl, hl = _get_serper_locale(country_code)
        if gl:
            payload["gl"] = gl
        payload["hl"] = language_code or hl
        return payload

    async def fetch_page(page: int, attempt: int = 0) -> dict:
        r = await http.post(
            "https://google.serper.dev/search",
            json=make_payload(page),
            headers={"Content-Type": "application/json", "X-API-KEY": serper_key},
            timeout=15.0,
        )
        if r.status_code == 429 and attempt < 3:
            await asyncio.sleep(0.8 * (attempt + 1))
            return await fetch_page(page, attempt + 1)
        r.raise_for_status()
        return r.json()

    raw: list[dict] = []
    pages_fetched = 0
    for i in range(num_pages):
        if i > 0:
            await asyncio.sleep(0.3)
        page_data = await fetch_page(i + 1)
        raw.append(page_data)
        pages_fetched += 1
        if not page_data.get("organic"):
            break

    organic = [item for page in raw for item in page.get("organic", [])]
    return organic, raw, pages_fetched


async def _scrape_firecrawl(
    url: str, firecrawl_key: str, http: httpx.AsyncClient
) -> str | None:
    try:
        r = await http.post(
            "https://api.firecrawl.dev/v1/scrape",
            json={"url": url, "formats": ["markdown"], "onlyMainContent": True},
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {firecrawl_key}",
            },
            timeout=8.0,
        )
        if not r.is_success:
            return None
        data = r.json()
        if not data.get("success") or not data.get("data", {}).get("markdown"):
            return None
        return data["data"]["markdown"][:8000]
    except Exception as e:
        print(f"[firecrawl] failed to scrape {url}: {e}")
        return None


async def _classify_with_claude(
    client: anthropic.AsyncAnthropic,
    articles: list[dict],
    name: str,
    countries: list[str],
    keywords: list[str],
    subject_type: str,
    language_name: str,
    scan_focus: str | None,
    model: str = "claude-haiku-4-5-20251001",
) -> list[dict]:
    if not articles:
        return []

    article_list = "\n\n---\n\n".join(
        f"[{i+1}] URL: {a['url']}\nTitle: {a['title']}\nSnippet: {a['snippet']}\nContent: {a['content']}"
        for i, a in enumerate(articles)
    )

    name_parts = name.split()
    first_name = name_parts[0] if name_parts else name
    last_name = " ".join(name_parts[1:])
    countries_label = ", ".join(countries)
    keyword_list = ", ".join(keywords) if keywords else "general reputation"

    country_line = ""
    if countries:
        country_line = (
            f"The subject is a company from {countries_label}. Only include results clearly relevant to this company and these regions."
            if subject_type == "company"
            else f"The subject is from {countries_label}. Only include results clearly relevant to this person and these regions."
        )

    name_filter = ""

    scan_focus_rules: dict[str, str] = {
        "negative": "\nSCAN FOCUS: Return ONLY articles with NEGATIVE sentiment or HIGH/MEDIUM risk. Exclude all positive and neutral articles from the output entirely.\n",
        "positive": "\nSCAN FOCUS: Return ONLY articles with POSITIVE sentiment. Exclude all negative and neutral articles from the output entirely.\n",
        "neutral": "\nSCAN FOCUS: Return ONLY articles with NEUTRAL sentiment (purely informational). Exclude all negative and positive articles from the output entirely.\n",
    }
    scan_focus_rule = (
        scan_focus_rules.get(scan_focus or "", "")
        if scan_focus and scan_focus != "all"
        else ""
    )

    prompt = (
        f'You are a reputation intelligence analyst. Classify the following {len(articles)} articles about "{name}".\n\n'
        f"{country_line}\nSearch context keywords used: {keyword_list}\n{scan_focus_rule}\n"
        f"CLASSIFICATION RULES:\n\nNEGATIVE sentiment — classify if the article contains ANY of:\n"
        f"- Criminal investigations, police involvement, charges, arrests\n"
        f"- Lawsuits, legal disputes, court cases, regulatory sanctions\n"
        f"- Fraud, scams, financial misconduct\n"
        f"- Accusations, allegations, or suspicion of wrongdoing\n"
        f"- Controversies, scandals, or reputation-damaging incidents\n"
        f"- Accidents or incidents involving the subject\n"
        f"- WHEN IN DOUBT between negative and neutral → choose NEGATIVE\n\n"
        f"POSITIVE sentiment — classify if the article CLEARLY shows:\n"
        f"- Awards, honors, recognitions\n"
        f"- Major achievements or business/professional success\n"
        f"- Leadership appointments or promotions\n"
        f"- Strong positive media coverage praising the person\n\n"
        f"NEUTRAL sentiment — ONLY if:\n"
        f"- Purely informational (Wikipedia entry, directory listing, company profile)\n"
        f"- ZERO reputational concern whatsoever\n"
        f"- No legal mentions, no incidents, no controversy\n\n"
        f'RISK CLASSIFICATION:\n- "high": crimes, fraud, lawsuits, investigations, illegal activity\n'
        f'- "medium": accidents, controversies, allegations, complaints\n'
        f'- "low": minor criticism or weak negative mentions\n'
        f'- "none": positive or neutral content\n\n'
        f"{name_filter}\n\nARTICLES TO CLASSIFY:\n{article_list}\n\n"
        f"Return a JSON array only — no explanation, no markdown code fences. Each element must have:\n"
        f'{{\n  "url": "...",\n  "title": "...",\n'
        f'  "snippet": "3 sentence explanation of the reputational significance of this article, written in your own words based on the title and content — not copied from the source. Write the snippet in {language_name}.",\n'
        f'  "sentiment": "negative" | "positive" | "neutral",\n'
        f'  "risk": "high" | "medium" | "low" | "none",\n'
        f'  "source": "domain.com",\n'
        f'  "type": "criminal" | "legal" | "news" | "complaint" | "regulatory" | "social" | "award" | "achievement" | "profile" | "wiki" | "directory"\n'
        f"}}\n\nReturn ONLY the JSON array. If no valid articles, return []."
    )

    async with client.messages.stream(
        model=model,
        max_tokens=64000,
        messages=[{"role": "user", "content": prompt}],
    ) as stream:
        response = await stream.get_final_message()

    if response.stop_reason == "max_tokens":
        print("[classify] Claude hit max_tokens — JSON may be truncated")

    text_block = next((b for b in response.content if b.type == "text"), None)
    if not text_block:
        return []
    json_match = re.search(r"\[[\s\S]*\]", text_block.text.strip())
    if not json_match:
        return []
    try:
        return json.loads(json_match.group())
    except Exception:
        return []


async def _generate_meeting_summary(
    client: anthropic.AsyncAnthropic,
    name: str,
    score: int,
    links: list[dict],
    language_name: str,
    model: str = "claude-haiku-4-5-20251001",
) -> dict:
    try:
        neg_links = [
            l
            for l in links
            if l.get("sentiment") == "negative" or l.get("risk") in ("high", "medium")
        ]
        pos_links = [l for l in links if l.get("sentiment") == "positive"]
        high_links = [l for l in links if l.get("risk") == "high"]
        med_links = [l for l in links if l.get("risk") == "medium"]
        neutral_links = [l for l in links if l.get("sentiment") == "neutral"]

        score_breakdown = f"Score: {score}/100 | High-risk: {len(high_links)} | Medium-risk: {len(med_links)} | Positive: {len(pos_links)} | Neutral: {len(neutral_links)}"

        neg_summary = (
            "Negative/Risk findings:\n"
            + "\n".join(
                f"- [{(l.get('risk') or 'none').upper()}] \"{l.get('title', '')}\" — {l.get('source', '')}"
                + (f" ({l['date']})" if l.get("date") else "")
                + f"\n  {l.get('snippet', '')}"
                for l in neg_links[:8]
            )
            if neg_links
            else "No negative results found."
        )

        pos_summary = (
            "Positive findings:\n"
            + "\n".join(
                f"- \"{l.get('title', '')}\" — {l.get('source', '')}"
                + (f" ({l['date']})" if l.get("date") else "")
                for l in pos_links[:4]
            )
            if pos_links
            else "No positive results found."
        )

        prompt = (
            f"Analyze the following publicly available web search findings about a prospective client and produce an internal sales brief.\n\n"
            f'Subject: "{name}"\n{score_breakdown}\n\n{neg_summary}\n\n{pos_summary}\n\n'
            f"Return ONLY a JSON object with these 5 fields (no markdown, no explanation):\n"
            f'{{\n  "headline": "one sharp sentence summarising the reputational situation for the sales team",\n'
            f'  "issues": ["5-8 specific key reputation points — cite article titles or sources where relevant"],\n'
            f'  "talkingPoints": ["4-6 opening lines for the client meeting — reference their actual situation, not generic phrases"],\n'
            f'  "riskIndicators": ["4-6 concrete risk flags drawn from the findings above — include source name and date where available"],\n'
            f'  "objectionHandlers": ["4-5 sharp, specific rebuttals for when the prospect says they don\'t need reputation management — reference their actual findings"]\n'
            f"}}\n\nWrite all output in {language_name}."
        )

        response = await client.messages.create(
            model=model,
            max_tokens=16000,
            system=(
                "You are an AI assistant embedded in a professional reputation intelligence platform used by "
                "reputation management firms. Your task is to analyze publicly available web search results "
                "about a prospective client and produce structured internal sales briefing notes. "
                "The findings below are summaries of news articles and web sources retrieved from public search engines. "
                "Respond only with the requested JSON object."
            ),
            messages=[{"role": "user", "content": prompt}],
        )
        text_block = next((b for b in response.content if b.type == "text"), None)
        if text_block:
            json_match = re.search(r"\{[\s\S]*\}", text_block.text.strip())
            if json_match:
                return json.loads(json_match.group())
        print(
            f"[meeting-summary] no JSON extracted; response: {text_block.text[:300] if text_block else 'no text block'}"
        )
    except Exception as e:
        print(f"[meeting-summary] error: {e}")

    return _fallback_summary(score)


# ── Request model ────────────────────────────────────────────────────────────


class GenerateLeadRequest(BaseModel):
    firstName: str | None = None
    lastName: str | None = None
    company: str | None = None
    country: str | None = None
    countries: list[str] | None = None
    keywords: list[str] = []
    pagesCap: int = 2
    subjectType: Literal["individual", "company"] = "individual"
    reportLanguage: str | None = None
    useKeywords: bool = True
    scanFocus: str | None = None
    scanTier: Literal["standard", "advanced"] = "standard"


# ── Core logic (extracted so background runner can call it) ──────────────────


async def _execute_generate_lead(
    body: GenerateLeadRequest, settings, job_id: uuid.UUID | None = None
) -> dict:
    countries: list[str] = (
        body.countries
        if body.countries and len(body.countries) > 0
        else ([body.country] if body.country else [])
    )
    if not countries or (body.useKeywords and not body.keywords):
        raise ValueError("Required fields missing")

    tier_model = (
        "claude-haiku-4-5-20251001"
        if body.scanTier == "standard"
        else "claude-sonnet-4-6"
    )

    search_subject = (
        (body.company or "").strip()
        if body.subjectType == "company" and body.company
        else f"{(body.firstName or '').strip()} {(body.lastName or '').strip()}".strip()
    )
    sanitized_subject = search_subject[:200].replace("\r", " ").replace("\n", " ")

    primary_country = countries[0]
    country_code = _country_code(primary_country)
    _, language_code = _get_serper_locale(country_code)

    output_language_name = (
        REPORT_LANG_MAP.get(body.reportLanguage, "English")
        if body.reportLanguage
        else LANG_CODE_TO_NAME.get(language_code or "", "English")
    )

    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

    async with httpx.AsyncClient() as http:
        # ── Phase 1: Serper searches ──────────────────────────────────────────
        if job_id:
            await _set_step(job_id, "serper_search")
        quoted_subject = f'"{sanitized_subject}"' if body.subjectType != "company" else sanitized_subject
        search_queries = [quoted_subject]
        if body.useKeywords:
            search_queries += [f"{quoted_subject} {kw}" for kw in body.keywords]

        country_configs = [
            {
                "country_code": (cc := _country_code(c)),
                "language_code": _get_serper_locale(cc)[1],
            }
            for c in countries
        ]

        all_searches = [
            {"q": q, "cc": cfg["country_code"], "lc": cfg["language_code"]}
            for q in search_queries
            for cfg in country_configs
        ]

        _serper_sem = asyncio.Semaphore(5)

        async def _fetch_one_serper(search: dict) -> tuple[list[dict], list[dict], int]:
            async with _serper_sem:
                await asyncio.sleep(0.1)
                return await _search_serper(
                    search["q"],
                    search["cc"],
                    search["lc"],
                    body.pagesCap or 2,
                    settings.serper_api_key,
                    http,
                )

        serper_results: list[tuple[list[dict], list[dict], int]] = list(
            await asyncio.gather(*[_fetch_one_serper(s) for s in all_searches])
        )

        all_organic = [r[0] for r in serper_results]
        all_raw = [r[1] for r in serper_results]
        all_pages_fetched = [r[2] for r in serper_results]

        # ── Phase 2: Deduplicate & scrape ─────────────────────────────────────
        if job_id:
            await _set_step(job_id, "firecrawl_scrape")
        seen_urls: set[str] = set()
        articles: list[dict] = []
        date_map: dict[str, str] = {}
        keyword_map: dict[str, list[str]] = {}
        country_map: dict[str, str] = {}
        num_countries = len(country_configs) or 1

        for kw_idx, results in enumerate(all_organic):
            country_idx = kw_idx % num_countries
            query_idx = kw_idx // num_countries
            kw_keyword_idx = query_idx - 1
            kw = (
                body.keywords[kw_keyword_idx]
                if body.useKeywords and 0 <= kw_keyword_idx < len(body.keywords)
                else None
            )
            for r in results:
                url = r.get("link", "")
                if not url:
                    continue
                if url not in seen_urls:
                    seen_urls.add(url)
                    articles.append(
                        {
                            "url": url,
                            "title": r.get("title", ""),
                            "snippet": r.get("snippet", ""),
                            "content": r.get("snippet", ""),
                        }
                    )
                    if r.get("date"):
                        date_map[url] = r["date"]
                    if kw:
                        keyword_map[url] = [kw]
                    if country_idx < len(countries):
                        country_map[url] = countries[country_idx]
                elif kw and kw not in keyword_map.get(url, []):
                    keyword_map.setdefault(url, []).append(kw)

        _name_parts = sanitized_subject.split()
        if body.subjectType == "company":
            _company_words = [
                w
                for w in re.findall(r"[a-z0-9]+", _strip_diacritics(sanitized_subject))
                if len(w) > 2
            ]
            if _company_words:
                articles = [
                    a
                    for a in articles
                    if all(
                        w in _strip_diacritics(a["title"] + " " + a["snippet"])
                        for w in _company_words
                    )
                ]
        else:
            _fn = _strip_diacritics(_name_parts[0]) if _name_parts else ""
            _ln = (
                _strip_diacritics(" ".join(_name_parts[1:]))
                if len(_name_parts) > 1
                else ""
            )
            if _fn and _ln:
                articles = [
                    a
                    for a in articles
                    if _fn in _strip_diacritics(a["title"] + " " + a["snippet"])
                    and _ln in _strip_diacritics(a["title"] + " " + a["snippet"])
                ]

        articles = [
            a for a in articles
            if not a["url"].lower().split("?")[0].endswith(".pdf")
        ]

        urls_sent_to_firecrawl = [a["url"] for a in articles]

        BATCH_SIZE = 15
        scrape_results: list[str | None] = []
        for b_start in range(0, len(articles), BATCH_SIZE):
            if b_start > 0:
                await asyncio.sleep(0.5)
            batch = articles[b_start : b_start + BATCH_SIZE]
            batch_results = await asyncio.gather(
                *[
                    (
                        _scrape_firecrawl(a["url"], settings.firecrawl_api_key, http)
                        if not await _is_pdf(a["url"], http)
                        and settings.firecrawl_api_key
                        else asyncio.sleep(0)
                    )
                    for a in batch
                ],
                return_exceptions=True,
            )
            for item in batch_results:
                scrape_results.append(item if isinstance(item, str) else None)

        firecrawl_success: list[str] = []
        firecrawl_failed: list[str] = []
        for i, content in enumerate(scrape_results):
            if content:
                articles[i]["content"] = content
                firecrawl_success.append(articles[i]["url"])
            else:
                firecrawl_failed.append(articles[i]["url"])

        if body.subjectType != "company":
            _nf_parts = sanitized_subject.split()
            _nf_first = _nf_parts[0] if _nf_parts else ""
            _nf_last = " ".join(_nf_parts[1:]) if len(_nf_parts) > 1 else ""
            if _nf_first and _nf_last:
                before = len(articles)
                articles = [
                    a for a in articles
                    if _passes_name_filter(a, _nf_first, _nf_last)
                ]
                print(f"[name_filter] {before} → {len(articles)} articles after hard filter")

        urls_sent_to_claude = [a["url"] for a in articles]

    # ── Phase 3: Claude classification (batched to stay under 200K token limit) ──
    if job_id:
        await _set_step(job_id, "claude_classification")
    CLASSIFY_BATCH_SIZE = 20
    _claude_sem = asyncio.Semaphore(3)

    async def _classify_batch(batch: list[dict]) -> list[dict]:
        async with _claude_sem:
            return await _classify_with_claude(
                client,
                batch,
                sanitized_subject,
                countries,
                body.keywords,
                body.subjectType,
                output_language_name,
                body.scanFocus,
                tier_model,
            )

    batches = [
        articles[i : i + CLASSIFY_BATCH_SIZE]
        for i in range(0, len(articles), CLASSIFY_BATCH_SIZE)
    ]
    batch_results = await asyncio.gather(*[_classify_batch(b) for b in batches])
    classified: list[dict] = [item for result in batch_results for item in result]

    if body.scanFocus == "negative":
        classified = [
            a for a in classified
            if a.get("sentiment") == "negative" or a.get("risk") in ("high", "medium")
        ]
    elif body.scanFocus == "positive":
        classified = [a for a in classified if a.get("sentiment") == "positive"]
    elif body.scanFocus == "neutral":
        classified = [a for a in classified if a.get("sentiment") == "neutral"]

    def sort_key(link: dict) -> tuple:
        ts = _parse_serper_date(link.get("date") or "")
        return (0, -ts) if not math.isnan(ts) else (1, 0)

    deduped = sorted(
        [
            {
                **link,
                "date": date_map.get(link["url"]),
                "keywords": keyword_map.get(link["url"], []),
                "country": country_map.get(link["url"]),
            }
            for link in _dedupe_links(classified)
        ],
        key=sort_key,
    )

    negative = [l for l in deduped if l.get("sentiment") == "negative"]
    positive = [l for l in deduped if l.get("sentiment") == "positive"]
    neutral = [l for l in deduped if l.get("sentiment") == "neutral"]
    score = _derive_score(len(negative), len(positive))

    if job_id:
        await _set_step(job_id, "generating_brief")
    summary = await _generate_meeting_summary(
        client, sanitized_subject, score, deduped, output_language_name, tier_model
    )

    return {
        "links": deduped,
        "negative": negative,
        "positive": positive,
        "neutral": neutral,
        "summary": summary,
        "score": score,
        "scanTier": body.scanTier,
        "_serper": [
            {
                "keyword": (
                    body.keywords[kw_idx - 1]
                    if body.useKeywords
                    and kw_idx >= 1
                    and kw_idx - 1 < len(body.keywords)
                    else all_searches[i]["q"]
                ),
                "country": (
                    countries[i % num_countries]
                    if i % num_countries < len(countries)
                    else "unknown"
                ),
                "query": all_searches[i]["q"],
                "pagesTraversed": (
                    all_pages_fetched[i] if i < len(all_pages_fetched) else 0
                ),
                "count": len(all_organic[i]) if i < len(all_organic) else 0,
                "links": [
                    r.get("link")
                    for page in (all_raw[i] if i < len(all_raw) else [])
                    for r in page.get("organic", [])
                ],
            }
            for i, kw_idx in enumerate(
                i // num_countries for i in range(len(all_searches))
            )
        ],
        "_firecrawl": (
            [
                {
                    "keyword": kw,
                    "sent": [
                        u
                        for u in urls_sent_to_firecrawl
                        if kw in keyword_map.get(u, [])
                    ],
                    "success": [
                        u for u in firecrawl_success if kw in keyword_map.get(u, [])
                    ],
                    "failed": [
                        u for u in firecrawl_failed if kw in keyword_map.get(u, [])
                    ],
                }
                for kw in body.keywords
            ]
            if body.useKeywords
            else [
                {
                    "keyword": None,
                    "sent": urls_sent_to_firecrawl,
                    "success": firecrawl_success,
                    "failed": firecrawl_failed,
                }
            ]
        ),
        "_claude": (
            [
                {
                    "keyword": kw,
                    "sent": [
                        u for u in urls_sent_to_claude if kw in keyword_map.get(u, [])
                    ],
                }
                for kw in body.keywords
            ]
            if body.useKeywords
            else [{"keyword": None, "sent": urls_sent_to_claude}]
        ),
    }


# ── Background runner ────────────────────────────────────────────────────────


async def _update_job_status(
    job_id: uuid.UUID,
    status: str,
    result: dict | None = None,
    error: str | None = None,
) -> None:
    async with AsyncSessionLocal() as db:
        job = await db.get(GenerateLeadJob, job_id)
        job.status = status
        job.result = result
        job.error = error
        job.completed_at = datetime.now(timezone.utc)
        await db.commit()


async def _set_step(job_id: uuid.UUID, step: str) -> None:
    async with AsyncSessionLocal() as db:
        job = await db.get(GenerateLeadJob, job_id)
        if job:
            job.current_step = step
            await db.commit()


async def _run_job(job_id: uuid.UUID, body: GenerateLeadRequest) -> None:
    async with AsyncSessionLocal() as db:
        job = await db.get(GenerateLeadJob, job_id)
        job.status = "running"
        job.current_step = "building_queries"
        await db.commit()
    # session closed — no long-lived connection held open during the scan
    try:
        settings = get_settings()
        result = await _execute_generate_lead(body, settings, job_id=job_id)
        await _update_job_status(job_id, "done", result=result)
    except BaseException as e:
        await _update_job_status(job_id, "failed", error=f"{type(e).__name__}: {e}")
        raise


# ── Routes ───────────────────────────────────────────────────────────────────


@router.post("")
async def generate_lead(
    body: GenerateLeadRequest,
    analyst: WebAnalyst = Depends(get_current_web_analyst),
    db: AsyncSession = Depends(get_db),
) -> dict:
    settings = get_settings()
    if not settings.anthropic_api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not configured")
    if not settings.serper_api_key:
        raise HTTPException(status_code=500, detail="SERPER_API_KEY not configured")

    countries: list[str] = (
        body.countries
        if body.countries and len(body.countries) > 0
        else ([body.country] if body.country else [])
    )
    if not countries or (body.useKeywords and not body.keywords):
        raise HTTPException(status_code=400, detail="Required fields missing")

    job = GenerateLeadJob(created_by_id=analyst.id)
    db.add(job)
    await db.flush()
    job_id = job.id
    await db.commit()

    task = asyncio.create_task(_run_job(job_id, body))
    _background_tasks.add(task)
    task.add_done_callback(_background_tasks.discard)
    return {"job_id": str(job_id)}


@router.get("/{job_id}")
async def get_generate_lead_job(
    job_id: uuid.UUID,
    _analyst: WebAnalyst = Depends(get_current_web_analyst),
    db: AsyncSession = Depends(get_db),
) -> dict:
    job = await db.get(GenerateLeadJob, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return {
        "status": job.status,
        "result": job.result,
        "error": job.error,
        "current_step": job.current_step,
    }
