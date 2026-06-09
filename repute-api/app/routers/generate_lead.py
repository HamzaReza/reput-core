import asyncio
import json
import math
import pathlib
import re
import unicodedata
import uuid
from datetime import datetime, timezone
from typing import Literal
from urllib.parse import unquote, urlparse

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
_job_tasks: dict[uuid.UUID, asyncio.Task] = {}

_PDF_URL_PATTERN = re.compile(r"\.pdf(?:$|[?#/&])")

_GL_COUNTRY_MAP: dict[str, str] = {
    entry["name"].lower(): entry["code"]
    for entry in json.loads(
        (pathlib.Path(__file__).parent / "google_countries.json").read_text()
    )
}
# Modern/ISO names that differ from the legacy names in google_countries.json
_GL_COUNTRY_MAP.update({
    "bolivia, plurinational state of": "bo",
    "cabo verde": "cv",
    "congo, democratic republic of the": "cd",
    "côte d'ivoire": "ci",
    "czechia": "cz",
    "eswatini": "sz",
    "holy see": "va",
    "libya": "ly",
    "netherlands, kingdom of the": "nl",
    "north macedonia": "mk",
    "palestine, state of": "ps",
    "réunion": "re",
    "saint helena, ascension and tristan da cunha": "sh",
    "serbia": "rs",
    "türkiye": "tr",
    "united kingdom of great britain and northern ireland": "gb",
    "united states of america": "us",
    "venezuela, bolivarian republic of": "ve",
    "virgin islands (british)": "vg",
    "virgin islands (u.s.)": "vi",
})

# ── Lookup tables ────────────────────────────────────────────────────────────


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
    return _GL_COUNTRY_MAP.get(k) or (k if len(k) == 2 else None)


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


def _normalize_name_tokens(s: str) -> list[str]:
    return re.findall(r"[a-z0-9]+", _strip_diacritics(s))


def _has_token_sequence(tokens: list[str], sequence: list[str]) -> bool:
    if not tokens or not sequence or len(sequence) > len(tokens):
        return False
    return any(
        tokens[i : i + len(sequence)] == sequence
        for i in range(len(tokens) - len(sequence) + 1)
    )


def _token_matches_name_part(token: str, expected_parts: list[str]) -> bool:
    for part in expected_parts:
        if token == part:
            return True
        if len(token) == 1 and part.startswith(token):
            return True
        if len(part) == 1 and token.startswith(part):
            return True
    return False


_NAME_PARTICLES = {
    "the",
    "and",
    "del",
    "di",
    "de",
    "von",
    "van",
    "el",
    "da",
    "do",
    "das",
    "dos",
    "la",
    "le",
    "les",
    "bin",
    "bint",
}


def _passes_name_filter_legacy(article: dict, first_name: str, last_name: str) -> bool:
    raw = " ".join(
        [
            article.get("title", ""),
            article.get("snippet", ""),
            article.get("content", ""),
        ]
    )
    text = _strip_diacritics(raw)
    first = _strip_diacritics(first_name)
    last = _strip_diacritics(last_name)

    if f"{first} {last}" in text or f"{last} {first}" in text:
        return True

    # For multi-word last names use the final word as the regex anchor
    last_word = last.split()[-1] if last.split() else last

    # Check hyphenated compound surnames e.g. "GASPAR-BARRIOS" → finds "barrios"
    for match in re.findall(
        rf"\b(\w+)-{re.escape(last_word)}\b|\b{re.escape(last_word)}-(\w+)\b", text
    ):
        found = (match[0] or match[1]).lower()
        if len(found) > 2 and found not in _NAME_PARTICLES:
            if found != first and found not in first and first not in found:
                return False

    # Check space-separated adjacent words
    for match in re.findall(
        rf"\b(\w+)\s+{re.escape(last_word)}\b|\b{re.escape(last_word)}\s+(\w+)\b", text
    ):
        found = (match[0] or match[1]).lower()
        if len(found) <= 2:
            continue
        if found in _NAME_PARTICLES:
            continue
        if found != first and found not in first and first not in found:
            return False

    return True


def _passes_name_filter(article: dict, first_name: str, last_name: str) -> bool:
    raw = " ".join(
        [
            article.get("title", ""),
            article.get("snippet", ""),
            article.get("content", ""),
        ]
    )
    text_tokens = _normalize_name_tokens(raw)
    first_tokens = _normalize_name_tokens(first_name)
    last_tokens = _normalize_name_tokens(last_name)
    if not text_tokens or not first_tokens or not last_tokens:
        return True

    full_name_tokens = first_tokens + last_tokens
    if _has_token_sequence(text_tokens, full_name_tokens):
        return True

    surname_first_tokens = [last_tokens[-1], *first_tokens, *last_tokens[:-1]]
    if _has_token_sequence(text_tokens, surname_first_tokens):
        return True

    headline_tokens = _normalize_name_tokens(
        " ".join([article.get("title", ""), article.get("snippet", "")])
    )
    last_word = last_tokens[-1]
    expected_leading_parts = first_tokens + last_tokens[:-1]
    # Recall guard: drop on a surname-adjacency mismatch only when none of the
    # subject's given names (first + middle) appear anywhere — otherwise it's
    # plausibly them (e.g. a middle name the query omitted), so keep.
    subject_given_present = bool(set(expected_leading_parts) & set(text_tokens))
    for idx, token in enumerate(headline_tokens):
        if token != last_word or idx == 0:
            continue
        found = headline_tokens[idx - 1]
        if len(found) <= 2 or found in _NAME_PARTICLES:
            continue
        if not _token_matches_name_part(found, expected_leading_parts):
            if subject_given_present:
                continue
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


def _is_youtube(url: str) -> bool:
    """
    Detect YouTube URLs. Scraping them returns no useful content (player chrome
    only, no transcript) and risks 5-credit stealth retries, so we skip Firecrawl
    and let Claude classify them from the Serper title + snippet instead.
    """
    try:
        host = urlparse(unquote(url)).netloc.lower()
    except ValueError:
        return False
    return (
        host in ("youtube.com", "youtu.be")
        or host.endswith(".youtube.com")
        or host.endswith(".youtu.be")
    )


async def _is_pdf(url: str, http: httpx.AsyncClient) -> bool:
    """
    Detect if a URL points to a PDF file.

    Strategy:
    1. Check the URL for common PDF patterns (fastest, no network)
    2. Make a HEAD request to inspect redirect targets and response headers
    3. Fall back to a tiny ranged GET when HEAD is inconclusive
    4. On network errors, assume PDF so we do not spend Firecrawl credits
    """

    def _looks_like_pdf_url(candidate: str) -> bool:
        return bool(_PDF_URL_PATTERN.search(unquote(candidate).lower()))

    def _pdf_header_reason(response: httpx.Response) -> str | None:
        final_url = str(response.url)
        content_type = response.headers.get("content-type", "").lower()
        content_disp = response.headers.get("content-disposition", "").lower()

        if _looks_like_pdf_url(final_url):
            if final_url != url:
                return "redirected URL pattern"
            return "URL pattern"
        if "application/pdf" in content_type:
            return "Content-Type header"
        if "pdf" in content_disp:
            return "Content-Disposition header"
        if "pdf" in content_type:
            return "non-standard Content-Type header"
        return None

    if _looks_like_pdf_url(url):
        print(f"[_is_pdf] Filtered PDF by URL pattern: {url}")
        return True

    try:
        head_response = await http.head(
            url,
            timeout=3.0,
            follow_redirects=True,
        )
        head_reason = _pdf_header_reason(head_response)
        if head_reason:
            print(f"[_is_pdf] Filtered PDF by {head_reason}: {url}")
            return True

        head_content_type = head_response.headers.get("content-type", "").lower()
        head_inconclusive = (
            not head_response.is_success
            or not head_content_type
            or head_content_type == "application/octet-stream"
        )

        if not head_inconclusive:
            return False

        print(
            f"[_is_pdf] HEAD inconclusive for {url} "
            f"(status={head_response.status_code}, content-type={head_content_type or 'missing'}), "
            "falling back to GET"
        )

        async with http.stream(
            "GET",
            url,
            headers={"Range": "bytes=0-1023"},
            timeout=5.0,
            follow_redirects=True,
        ) as get_response:
            get_reason = _pdf_header_reason(get_response)
            if get_reason:
                print(f"[_is_pdf] Filtered PDF by {get_reason}: {url}")
                return True

            async for chunk in get_response.aiter_bytes():
                if chunk.lstrip().startswith(b"%PDF-"):
                    print(f"[_is_pdf] Filtered PDF by file signature: {url}")
                    return True
                break

        return False

    except asyncio.TimeoutError:
        print(f"[_is_pdf] Timeout while probing {url}, assuming PDF")
        return True
    except httpx.RequestError as e:
        print(
            f"[_is_pdf] Network error probing {url}: {type(e).__name__}, assuming PDF"
        )
        return True
    except Exception as e:
        print(
            f"[_is_pdf] Unexpected error probing {url}: {type(e).__name__}, assuming PDF"
        )
        return True


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
    background: str | None = None,
    pre_analysis_profile: dict | None = None,
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

    # Build subject context block from pre-analysis profile and/or analyst-provided background
    _ctx_parts: list[str] = []
    if pre_analysis_profile and isinstance(pre_analysis_profile, dict):
        _identity = (pre_analysis_profile.get("identity") or "").strip()
        _bg = (pre_analysis_profile.get("background") or "").strip()
        _neg = (pre_analysis_profile.get("negative_findings") or "").strip()
        if _identity:
            _ctx_parts.append(f"Identity: {_identity}")
        if _bg:
            _ctx_parts.append(f"Background: {_bg}")
        _neg_fallbacks = {
            "no negative findings in available sources.",
            "no negative findings in available sources",
        }
        if _neg and _neg.lower().rstrip(".") not in _neg_fallbacks:
            _ctx_parts.append(f"Known negative findings: {_neg}")
    if background:
        _ctx_parts.append(f"Analyst context: {background.strip()}")

    subject_context_block = (
        "SUBJECT CONTEXT — use to verify article relevance and improve classification accuracy:\n"
        + "\n".join(_ctx_parts)
        + "\n\n"
        if _ctx_parts
        else ""
    )
    homonym_rule = (
        "HOMONYM RULE: If an article is clearly about a different person who shares the same name "
        "but has a completely different profession, country, or background from the subject context "
        "above — omit that article from your output entirely.\n\n"
        if _ctx_parts and subject_type != "company"
        else ""
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
        f"{country_line}\n{subject_context_block}{homonym_rule}Search context keywords used: {keyword_list}\n{scan_focus_rule}\n"
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


async def _classify_unscraped_with_claude(
    client: anthropic.AsyncAnthropic,
    articles: list[dict],
    name: str,
    countries: list[str],
    keywords: list[str],
    subject_type: str,
    language_name: str,
    scan_focus: str | None,
    model: str = "claude-haiku-4-5-20251001",
    background: str | None = None,
    pre_analysis_profile: dict | None = None,
) -> list[dict]:
    """Classify articles whose full content could not be scraped (snippet only).

    Uses a conservative prompt: no negative-bias default, requires an explicit
    reputational signal in the title/snippet, excludes generic social media pages.
    """
    if not articles:
        return []

    article_list = "\n\n---\n\n".join(
        f"[{i+1}] URL: {a['url']}\nTitle: {a['title']}\nSnippet: {a['snippet']}"
        for i, a in enumerate(articles)
    )

    countries_label = ", ".join(countries)
    keyword_list = ", ".join(keywords) if keywords else "general reputation"

    country_line = ""
    if countries:
        country_line = (
            f"The subject is a company from {countries_label}. Only include results clearly relevant to this company and these regions."
            if subject_type == "company"
            else f"The subject is from {countries_label}. Only include results clearly relevant to this person and these regions."
        )

    _ctx_parts: list[str] = []
    if pre_analysis_profile and isinstance(pre_analysis_profile, dict):
        _identity = (pre_analysis_profile.get("identity") or "").strip()
        _bg = (pre_analysis_profile.get("background") or "").strip()
        _neg = (pre_analysis_profile.get("negative_findings") or "").strip()
        if _identity:
            _ctx_parts.append(f"Identity: {_identity}")
        if _bg:
            _ctx_parts.append(f"Background: {_bg}")
        _neg_fallbacks = {
            "no negative findings in available sources.",
            "no negative findings in available sources",
        }
        if _neg and _neg.lower().rstrip(".") not in _neg_fallbacks:
            _ctx_parts.append(f"Known negative findings: {_neg}")
    if background:
        _ctx_parts.append(f"Analyst context: {background.strip()}")

    subject_context_block = (
        "SUBJECT CONTEXT — use to verify article relevance and improve classification accuracy:\n"
        + "\n".join(_ctx_parts)
        + "\n\n"
        if _ctx_parts
        else ""
    )
    homonym_rule = (
        "HOMONYM RULE: If an article is clearly about a different person who shares the same name "
        "but has a completely different profession, country, or background from the subject context "
        "above — omit that article from your output entirely.\n\n"
        if _ctx_parts and subject_type != "company"
        else ""
    )

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
        f"{country_line}\n{subject_context_block}{homonym_rule}Search context keywords used: {keyword_list}\n{scan_focus_rule}\n"
        f"IMPORTANT: These articles could NOT be scraped — only the short Google title and snippet are available. "
        f"Do NOT infer, assume, or fabricate any content beyond what is explicitly shown.\n\n"
        f"CLASSIFICATION RULES:\n\n"
        f"NEGATIVE sentiment — only if the title or snippet CLEARLY indicates:\n"
        f"- Criminal investigations, police involvement, charges, arrests\n"
        f"- Lawsuits, legal disputes, court cases, regulatory sanctions\n"
        f"- Fraud, scams, financial misconduct\n"
        f"- Accusations, allegations, or suspicion of wrongdoing\n"
        f"- Controversies, scandals, or reputation-damaging incidents\n\n"
        f"POSITIVE sentiment — only if the title or snippet CLEARLY shows:\n"
        f"- Awards, honors, recognitions\n"
        f"- Major achievements or business/professional success\n"
        f"- Leadership appointments or promotions\n\n"
        f"NEUTRAL sentiment — only if:\n"
        f"- Purely informational (Wikipedia entry, directory listing, company profile)\n"
        f"- ZERO reputational concern whatsoever\n\n"
        f'RISK CLASSIFICATION:\n- "high": crimes, fraud, lawsuits, investigations, illegal activity\n'
        f'- "medium": accidents, controversies, allegations, complaints\n'
        f'- "low": minor criticism or weak negative mentions\n'
        f'- "none": positive or neutral content\n\n'
        f"STRICT RULES — apply to every article in this batch:\n"
        f"- Only classify if the title or snippet contains a CLEAR, EXPLICIT reputational signal\n"
        f'- Generic social media pages (e.g. "John Smith | Facebook"), profile bios,\n'
        f"  directory listings, or results with no explicit signal → EXCLUDE\n"
        f"- WHEN IN DOUBT → EXCLUDE (not negative — there is simply not enough information)\n\n"
        f"ARTICLES TO CLASSIFY:\n{article_list}\n\n"
        f"Return a JSON array only — no explanation, no markdown code fences. Each element must have:\n"
        f'{{\n  "url": "...",\n  "title": "...",\n'
        f'  "snippet": "1-2 sentences based ONLY on the title and snippet shown. If not enough information, write \\"Content unavailable.\\"  Write in {language_name}.",\n'
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
        print("[classify-unscraped] Claude hit max_tokens — JSON may be truncated")

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

        system_prompt = (
            "You are an AI assistant embedded in a professional reputation intelligence platform used by "
            "reputation management firms. Your task is to analyze publicly available web search results "
            "about a prospective client and produce structured internal sales briefing notes. "
            "The findings below are summaries of news articles and web sources retrieved from public search engines. "
            "Respond only with the requested JSON object."
        )
        for attempt in range(3):
            try:
                response = await client.messages.create(
                    model=model,
                    max_tokens=16000,
                    system=system_prompt,
                    messages=[{"role": "user", "content": prompt}],
                )
                text_block = next(
                    (b for b in response.content if b.type == "text"), None
                )
                if text_block:
                    json_match = re.search(r"\{[\s\S]*\}", text_block.text.strip())
                    if json_match:
                        return json.loads(json_match.group())
                print(
                    f"[meeting-summary] no JSON (attempt {attempt + 1}); response: {text_block.text[:200] if text_block else 'no text block'}"
                )
            except Exception as e:
                print(f"[meeting-summary] error (attempt {attempt + 1}): {e}")
            if attempt < 2:
                await asyncio.sleep(1.5 * (attempt + 1))
    except Exception as e:
        print(f"[meeting-summary] setup error: {e}")

    return _fallback_summary(score)


# ── Request model ────────────────────────────────────────────────────────────


class GenerateLeadRequest(BaseModel):
    firstName: str | None = None
    middleName: str | None = None
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
    background: str | None = None
    preAnalysisProfile: dict | None = None


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
        else " ".join(filter(None, [
            (body.firstName or "").strip(),
            (body.middleName or "").strip(),
            (body.lastName or "").strip(),
        ]))
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

    # Structured per-stage pipeline trace returned as result["scanLog"].
    # Schema: docs/plans/2026-06-07-scan-log-design.md
    scan_log: dict = {}

    async with httpx.AsyncClient() as http:
        # ── Phase 1: Serper searches ──────────────────────────────────────────
        if job_id:
            await _set_step(job_id, "serper_search")
        _sname_parts = sanitized_subject.split()
        _search_subject = sanitized_subject
        if body.subjectType != "company" and len(_sname_parts) > 2:
            _middle = _sname_parts[1:-1]
            if all(len(p.rstrip(".")) == 1 for p in _middle):
                _search_subject = f"{_sname_parts[0]} {_sname_parts[-1]}"
        elif body.subjectType == "company":
            _COMPANY_SUFFIXES = re.compile(
                r",?\s*\b(LLC|Inc|Corp|Ltd|Co|LLP|LP|PLC|GmbH|S\.A\.?|S\.L\.?|BV|AG|NV)\.?\s*$",
                re.IGNORECASE,
            )
            _search_subject = _COMPANY_SUFFIXES.sub("", _search_subject).strip()
        quoted_subject = (
            f'"{_search_subject}"'
            if body.subjectType != "company"
            else _search_subject
        )
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

        _num_countries = len(country_configs) or 1
        scan_log["serper"] = {
            "queries": [
                {
                    "keyword": (
                        body.keywords[(i // _num_countries) - 1]
                        if body.useKeywords
                        and 1 <= (i // _num_countries) <= len(body.keywords)
                        else None
                    ),
                    "query": all_searches[i]["q"],
                    "country": (
                        countries[i % _num_countries]
                        if i % _num_countries < len(countries)
                        else None
                    ),
                    "pages": all_pages_fetched[i],
                    "count": len(all_organic[i]),
                    "links": [r.get("link") for r in all_organic[i] if r.get("link")],
                }
                for i in range(len(all_searches))
            ],
            "totalRaw": sum(len(o) for o in all_organic),
        }

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

        scan_log["serper"]["deduped"] = {
            "count": len(articles),
            "links": [a["url"] for a in articles],
        }

        # Track everything removed between dedupe and the scrape phase so
        # scanLog's deduped count reconciles with the firecrawl totals.
        _prefilter_dropped: list[dict] = []

        _name_parts = sanitized_subject.split()
        if body.subjectType == "company":
            _company_words = [
                w
                for w in re.findall(r"[a-z0-9]+", _strip_diacritics(_search_subject))
                if len(w) > 2
            ]
            if _company_words:
                _pf_kept: list[dict] = []
                for a in articles:
                    if all(
                        w in _strip_diacritics(a["title"] + " " + a["snippet"])
                        for w in _company_words
                    ):
                        _pf_kept.append(a)
                    else:
                        _prefilter_dropped.append(
                            {"url": a["url"], "reason": "company_words_missing"}
                        )
                articles = _pf_kept
        else:
            _fn = _strip_diacritics(_name_parts[0]) if _name_parts else ""
            _ln = _strip_diacritics(_name_parts[-1]) if len(_name_parts) > 1 else ""
            if _ln:
                _pf_kept = []
                for a in articles:
                    if _ln in _strip_diacritics(a["title"] + " " + a["snippet"]):
                        _pf_kept.append(a)
                    else:
                        _prefilter_dropped.append(
                            {"url": a["url"], "reason": "surname_not_in_snippet"}
                        )
                articles = _pf_kept

        _pf_kept = []
        for a in articles:
            if _PDF_URL_PATTERN.search(unquote(a["url"]).lower()):
                _prefilter_dropped.append({"url": a["url"], "reason": "pdf_url"})
            else:
                _pf_kept.append(a)
        articles = _pf_kept

        scan_log["prefilter"] = {
            "count": len(_prefilter_dropped),
            "dropped": _prefilter_dropped,
        }

        urls_sent_to_firecrawl: list[str] = []
        firecrawl_skipped: dict[str, str] = {}

        BATCH_SIZE = 15
        scrape_results_by_url: dict[str, str | None] = {}
        for b_start in range(0, len(articles), BATCH_SIZE):
            if b_start > 0:
                await asyncio.sleep(0.5)
            batch = articles[b_start : b_start + BATCH_SIZE]
            batch_to_scrape: list[dict] = []
            for article in batch:
                article_url = article["url"]
                if not settings.firecrawl_api_key:
                    skip_reason = "no_api_key"
                elif _is_youtube(article_url):
                    print(
                        f"[_is_youtube] Skipping Firecrawl, classifying from snippet: {article_url}"
                    )
                    skip_reason = "youtube"
                elif await _is_pdf(article_url, http):
                    skip_reason = "pdf"
                else:
                    skip_reason = None
                if skip_reason:
                    firecrawl_skipped[article_url] = skip_reason
                    scrape_results_by_url[article_url] = None
                    continue
                urls_sent_to_firecrawl.append(article_url)
                batch_to_scrape.append(article)

            if not batch_to_scrape:
                continue

            batch_results = await asyncio.gather(
                *[
                    _scrape_firecrawl(a["url"], settings.firecrawl_api_key, http)
                    for a in batch_to_scrape
                ],
                return_exceptions=True,
            )
            for article, item in zip(batch_to_scrape, batch_results):
                scrape_results_by_url[article["url"]] = (
                    item if isinstance(item, str) else None
                )

        firecrawl_success: list[str] = []
        firecrawl_failed: list[str] = []
        urls_sent_to_firecrawl_set = set(urls_sent_to_firecrawl)
        for article in articles:
            content = scrape_results_by_url.get(article["url"])
            if content:
                article["content"] = content
                firecrawl_success.append(article["url"])
            elif article["url"] in urls_sent_to_firecrawl_set:
                firecrawl_failed.append(article["url"])

        _skip_reasons = list(firecrawl_skipped.values())
        scan_log["firecrawl"] = {
            "skipped": {
                "count": len(firecrawl_skipped),
                "youtube": _skip_reasons.count("youtube"),
                "pdf": _skip_reasons.count("pdf"),
                "noApiKey": _skip_reasons.count("no_api_key"),
                "links": [
                    {"url": u, "reason": r} for u, r in firecrawl_skipped.items()
                ],
            },
            "success": {"count": len(firecrawl_success), "links": firecrawl_success},
            "failed": {"count": len(firecrawl_failed), "links": firecrawl_failed},
            # Articles never attempted (e.g. scraping aborted mid-run). Always
            # empty on this code path today; populated once batch short-circuit
            # behaviour lands.
            "notAttempted": {
                "count": len(articles)
                - len(urls_sent_to_firecrawl)
                - len(firecrawl_skipped),
                "links": [
                    a["url"]
                    for a in articles
                    if a["url"] not in urls_sent_to_firecrawl_set
                    and a["url"] not in firecrawl_skipped
                ],
            },
            "error": None,
        }

        _nf_first = ""
        _nf_last = ""
        name_filter_dropped: list[dict] = []
        if body.subjectType != "company":
            _nf_first = (body.firstName or "").strip()
            _middle = (body.middleName or "").strip()
            _last_only = (body.lastName or "").strip()
            # Fallback: derive names from the subject string when the structured
            # firstName/lastName fields are not provided by the caller.
            if not (_nf_first and _last_only):
                _parts = sanitized_subject.split()
                if len(_parts) > 1:
                    _nf_first = _parts[0]
                    _last_only = " ".join(_parts[1:])
                    _middle = ""
            _nf_last_full = f"{_middle} {_last_only}".strip() if _middle else _last_only
            _nf_last = _nf_last_full
            if _nf_first and _last_only:
                before = len(articles)
                kept = []
                for a in articles:
                    if _middle:
                        passes = (
                            _passes_name_filter(a, _nf_first, _nf_last_full)
                            or _passes_name_filter(a, _nf_first, _last_only)
                        )
                    else:
                        passes = _passes_name_filter(a, _nf_first, _last_only)
                    if passes:
                        kept.append(a)
                    else:
                        name_filter_dropped.append(a)
                articles = kept
                print(
                    f"[name_filter] {before} → {len(articles)} articles after hard filter"
                )

        # Only emitted when the individual-name filter actually ran — company
        # scans use the company-word prefilter instead (logged in prefilter),
        # and emitting empty names here renders a broken-looking card.
        if _nf_first and _nf_last:
            scan_log["nameFilter"] = {
                "firstName": _nf_first,
                "lastName": _nf_last,
                "keptCount": len(articles),
                "dropped": {
                    "count": len(name_filter_dropped),
                    "articles": [
                        {
                            "url": a["url"],
                            "title": a.get("title", ""),
                            "snippet": a.get("snippet", ""),
                            "content": a.get("content", ""),
                        }
                        for a in name_filter_dropped
                    ],
                },
            }

        urls_sent_to_claude = [a["url"] for a in articles]

    # ── Phase 3: Claude classification (batched to stay under 200K token limit) ──
    if job_id:
        await _set_step(job_id, "claude_classification")
    CLASSIFY_BATCH_SIZE = 20
    _claude_sem = asyncio.Semaphore(3)

    # Split into scraped (full content) and unscraped (snippet only) before classifying.
    # The two groups use different prompts: normal bias rules for scraped content,
    # conservative exclude-by-default rules for unscraped content to prevent hallucination.
    scraped_articles = [a for a in articles if scrape_results_by_url.get(a["url"])]
    unscraped_articles = [a for a in articles if not scrape_results_by_url.get(a["url"])]

    async def _classify_batch_normal(batch: list[dict]) -> list[dict]:
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
                background=body.background,
                pre_analysis_profile=body.preAnalysisProfile,
            )

    async def _classify_batch_unscraped(batch: list[dict]) -> list[dict]:
        async with _claude_sem:
            return await _classify_unscraped_with_claude(
                client,
                batch,
                sanitized_subject,
                countries,
                body.keywords,
                body.subjectType,
                output_language_name,
                body.scanFocus,
                tier_model,
                background=body.background,
                pre_analysis_profile=body.preAnalysisProfile,
            )

    scraped_batches = [
        scraped_articles[i : i + CLASSIFY_BATCH_SIZE]
        for i in range(0, len(scraped_articles), CLASSIFY_BATCH_SIZE)
    ]
    unscraped_batches = [
        unscraped_articles[i : i + CLASSIFY_BATCH_SIZE]
        for i in range(0, len(unscraped_articles), CLASSIFY_BATCH_SIZE)
    ]
    all_batches = scraped_batches + unscraped_batches
    all_tasks = (
        [_classify_batch_normal(b) for b in scraped_batches]
        + [_classify_batch_unscraped(b) for b in unscraped_batches]
    )
    batch_results = await asyncio.gather(*all_tasks)
    classified: list[dict] = [item for result in batch_results for item in result]

    _all_returned_urls = {item.get("url") for item in classified}
    _claude_dropped = [u for u in urls_sent_to_claude if u not in _all_returned_urls]
    scan_log["claude"] = {
        "model": tier_model,
        "scanFocus": body.scanFocus,
        "batches": [
            {
                "batch": bi + 1,
                "type": "scraped" if bi < len(scraped_batches) else "unscraped",
                "sentCount": len(batch),
                "sent": [a["url"] for a in batch],
                "returnedCount": len(batch_results[bi]),
                "returned": [
                    {
                        "url": item.get("url"),
                        "sentiment": item.get("sentiment"),
                        "risk": item.get("risk"),
                    }
                    for item in batch_results[bi]
                ],
            }
            for bi, batch in enumerate(all_batches)
        ],
        "dropped": {"count": len(_claude_dropped), "links": _claude_dropped},
    }

    if body.scanFocus == "negative":
        classified = [
            a
            for a in classified
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
        "scanLog": scan_log,
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
        "_name_filter": {
            "applied": body.subjectType != "company" and bool(_nf_first and _nf_last),
            "firstName": _nf_first,
            "lastName": _nf_last,
            "kept": [{"url": a["url"], "title": a.get("title", "")} for a in articles],
            "dropped": [
                {"url": a["url"], "title": a.get("title", "")}
                for a in name_filter_dropped
            ],
        },
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
    except asyncio.CancelledError:
        raise  # DB already updated to "cancelled" by DELETE route
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
    _job_tasks[job_id] = task
    task.add_done_callback(_background_tasks.discard)
    task.add_done_callback(lambda _: _job_tasks.pop(job_id, None))
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


@router.delete("/{job_id}")
async def cancel_generate_lead_job(
    job_id: uuid.UUID,
    analyst: WebAnalyst = Depends(get_current_web_analyst),
    db: AsyncSession = Depends(get_db),
) -> dict:
    job = await db.get(GenerateLeadJob, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.created_by_id != analyst.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    if job.status in ("done", "failed", "cancelled"):
        return {"status": job.status}
    task = _job_tasks.get(job_id)
    if task and not task.done():
        task.cancel()
    job.status = "cancelled"
    job.completed_at = datetime.now(timezone.utc)
    await db.commit()
    return {"status": "cancelled"}
