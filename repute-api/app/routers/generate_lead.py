import asyncio
import json
import re
from datetime import datetime
from typing import Literal

import anthropic
import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.config import get_settings
from app.models.lead import WebAnalyst
from app.utils.auth import get_current_web_analyst

router = APIRouter(prefix="/generate-lead", tags=["generate-lead"])

# ── Lookup tables ────────────────────────────────────────────────────────────

NATIONALITY_ALIASES: dict[str, str] = {
    "afghan": "AF", "albanian": "AL", "algerian": "DZ", "american": "US",
    "argentine": "AR", "australian": "AU", "austrian": "AT", "belgian": "BE",
    "brazilian": "BR", "british": "GB", "bulgarian": "BG", "canadian": "CA",
    "chilean": "CL", "chinese": "CN", "colombian": "CO", "croatian": "HR",
    "czech": "CZ", "danish": "DK", "dutch": "NL", "egyptian": "EG",
    "emirati": "AE", "finnish": "FI", "french": "FR", "german": "DE",
    "greek": "GR", "hungarian": "HU", "indian": "IN", "indonesian": "ID",
    "iranian": "IR", "iraqi": "IQ", "irish": "IE", "israeli": "IL",
    "italian": "IT", "japanese": "JP", "jordanian": "JO", "kenyan": "KE",
    "korean": "KR", "lebanese": "LB", "malaysian": "MY", "mexican": "MX",
    "moroccan": "MA", "new zealander": "NZ", "nigerian": "NG", "norwegian": "NO",
    "pakistani": "PK", "peruvian": "PE", "philippine": "PH", "polish": "PL",
    "portuguese": "PT", "romanian": "RO", "russian": "RU", "saudi": "SA",
    "serbian": "RS", "singaporean": "SG", "south african": "ZA", "spanish": "ES",
    "swedish": "SE", "swiss": "CH", "thai": "TH", "turkish": "TR",
    "ukranian": "UA", "ukrainian": "UA", "venezuelan": "VE", "vietnamese": "VN",
    "netherlands": "NL", "czech republic": "CZ", "uae": "AE", "uk": "GB",
    "united kingdom": "GB", "usa": "US", "united states": "US",
    "south korea": "KR", "turkiye": "TR", "turkey": "TR", "taiwan": "TW",
    "vietnam": "VN", "philippines": "PH", "iran": "IR", "russia": "RU",
    "syria": "SY", "venezuela": "VE", "bolivia": "BO", "moldova": "MD",
    "tanzania": "TZ", "laos": "LA", "north korea": "KP", "micronesia": "FM",
    "palestine": "PS", "ethiopia": "ET", "ghana": "GH", "senegal": "SN",
}

COUNTRY_TO_LANGUAGE: dict[str, str] = {
    "IT": "it", "FR": "fr", "DE": "de", "ES": "es", "PT": "pt", "NL": "nl",
    "PL": "pl", "RO": "ro", "HU": "hu", "CZ": "cs", "SK": "sk", "HR": "hr",
    "RU": "ru", "UA": "uk", "TR": "tr", "AR": "es", "JP": "ja", "KR": "ko",
    "CN": "zh-CN", "TW": "zh-TW", "SA": "ar", "AE": "ar", "EG": "ar",
    "IN": "hi", "TH": "th", "VN": "vi", "ID": "id", "MY": "ms", "GR": "el",
    "SE": "sv", "NO": "no", "FI": "fi", "DK": "da",
    "GB": "en", "US": "en", "CA": "en", "AU": "en", "IE": "en",
}

LANG_CODE_TO_NAME: dict[str, str] = {
    "en": "English", "it": "Italian", "es": "Spanish", "fr": "French",
    "de": "German", "pt": "Portuguese", "nl": "Dutch", "pl": "Polish",
    "ro": "Romanian", "hu": "Hungarian", "cs": "Czech", "ru": "Russian",
    "uk": "Ukrainian", "tr": "Turkish", "ja": "Japanese", "ko": "Korean",
    "zh-CN": "Chinese", "ar": "Arabic", "hi": "Hindi", "th": "Thai",
    "vi": "Vietnamese", "id": "Indonesian", "ms": "Malay", "el": "Greek",
    "sv": "Swedish", "no": "Norwegian", "fi": "Finnish", "da": "Danish",
}

REPORT_LANG_MAP: dict[str, str] = {"en": "English", "it": "Italian", "es": "Spanish"}

MONTH_MAP: dict[str, int] = {
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
    "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
    "gen": 1, "mag": 5, "giu": 6, "lug": 7, "ago": 8, "set": 9,
    "ott": 10, "dic": 12, "ene": 1, "abr": 4, "fév": 2, "avr": 4,
    "aoû": 8, "mär": 3, "okt": 10, "fev": 2, "out": 10,
}

_ENGLISH_MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
]

# ── Helpers ──────────────────────────────────────────────────────────────────

def _to_english_date(raw: str | None) -> str | None:
    import math
    if not raw:
        return None
    ts = _parse_serper_date(raw)
    if math.isnan(ts):
        return None
    dt = datetime.fromtimestamp(ts)
    return f"{dt.day} {_ENGLISH_MONTHS[dt.month - 1]} {dt.year}"


def _country_code(country: str) -> str | None:
    k = country.lower().strip()
    return NATIONALITY_ALIASES.get(k)


def _parse_serper_date(date_str: str) -> float:
    try:
        return datetime.fromisoformat(date_str).timestamp()
    except ValueError:
        pass
    m = re.match(r"^(\d{1,2})\s+([a-záàâäéèêëíìîïóòôöúùûüñç]+)\.?\s+(\d{4})$", date_str.strip(), re.IGNORECASE)
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
        existing_score = sentiment_priority.get(existing.get("sentiment", "neutral"), 2) * 10 + risk_priority.get(existing.get("risk", "none"), 1)
        new_score = sentiment_priority.get(link.get("sentiment", "neutral"), 2) * 10 + risk_priority.get(link.get("risk", "none"), 1)
        if new_score > existing_score:
            seen[url] = link
    return list(seen.values())


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
        "Clean profile — low urgency" if score >= 86
        else "Some concerns — moderate priority" if score >= 61
        else "Significant issues — high priority"
    )
    return {
        "headline": headline,
        "issues": ["Summary unavailable"],
        "talkingPoints": ["Discuss their current online presence", "Highlight risks of unmanaged reputation"],
        "riskIndicators": [],
        "objectionHandlers": [],
    }


async def _is_pdf(url: str, http: httpx.AsyncClient) -> bool:
    if ".pdf" in url.lower().split("?")[0]:
        return True
    try:
        r = await http.get(url, timeout=3.0)
        content_type = r.headers.get("content-type", "")
        content_disp = r.headers.get("content-disposition", "")
        return "application/pdf" in content_type or ".pdf" in content_disp.lower()
    except Exception:
        return False


async def _search_serper(
    query: str,
    country_code: str | None,
    language_code: str | None,
    num_pages: int,
    serper_key: str,
    http: httpx.AsyncClient,
) -> tuple[list[dict], list[dict]]:
    def make_payload(page: int) -> dict:
        payload: dict = {"q": query, "page": page}
        if country_code:
            payload["gl"] = country_code.lower()
        lang = language_code or (COUNTRY_TO_LANGUAGE.get(country_code.upper()) if country_code else None)
        if lang:
            payload["hl"] = lang
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
    for i in range(num_pages):
        if i > 0:
            await asyncio.sleep(0.3)
        raw.append(await fetch_page(i + 1))

    organic = [item for page in raw for item in page.get("organic", [])]
    return organic, raw


async def _scrape_firecrawl(url: str, firecrawl_key: str, http: httpx.AsyncClient) -> str | None:
    try:
        r = await http.post(
            "https://api.firecrawl.dev/v1/scrape",
            json={"url": url, "formats": ["markdown"], "onlyMainContent": True},
            headers={"Content-Type": "application/json", "Authorization": f"Bearer {firecrawl_key}"},
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

    if subject_type == "company":
        name_filter = (
            f'MANDATORY NAME FILTER:\nBefore classifying, check whether the company "{name}" is clearly identifiable in the title, snippet, or content.\n\n'
            f'INCLUDE the article if:\n• The company name "{name}" appears (case-insensitive)\n\n'
            f"EXCLUDE the article if:\n• The article clearly refers to a different company with a similar name, OR\n• The company name does not appear at all\n\n"
            f"If EXCLUDED → do not include this article in the output array at all."
        )
    else:
        name_filter = (
            f'MANDATORY NAME FILTER:\nBefore classifying, check whether the subject "{name}" is clearly identifiable in the title, snippet, or content.\n\n'
            f'INCLUDE the article if:\n• The full name "{name}" appears (case-insensitive), OR\n'
            f'• Both "{first_name}" AND "{last_name}" appear in close proximity (within the same sentence or paragraph)\n\n'
            f"EXCLUDE the article if:\n• Only the first name appears without the last name, OR\n"
            f"• Only the last name appears without the first name, OR\n"
            f"• The article is clearly about a different person with a similar name OR\n• Neither appears at all\n\n"
            f"If EXCLUDED → do not include this article in the output array at all."
        )

    scan_focus_rules: dict[str, str] = {
        "negative": "\nSCAN FOCUS: Return ONLY articles with NEGATIVE sentiment or HIGH/MEDIUM risk. Exclude all positive and neutral articles from the output entirely.\n",
        "positive": "\nSCAN FOCUS: Return ONLY articles with POSITIVE sentiment. Exclude all negative and neutral articles from the output entirely.\n",
        "neutral": "\nSCAN FOCUS: Return ONLY articles with NEUTRAL sentiment (purely informational). Exclude all negative and positive articles from the output entirely.\n",
    }
    scan_focus_rule = scan_focus_rules.get(scan_focus or "", "") if scan_focus and scan_focus != "all" else ""

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
        model="claude-sonnet-4-6",
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
) -> dict:
    neg_links = [l for l in links if l.get("sentiment") == "negative" or l.get("risk") in ("high", "medium")]
    pos_links = [l for l in links if l.get("sentiment") == "positive"]
    high_links = [l for l in links if l.get("risk") == "high"]
    med_links = [l for l in links if l.get("risk") == "medium"]
    neutral_links = [l for l in links if l.get("sentiment") == "neutral"]

    score_breakdown = f"Score: {score}/100 | High-risk: {len(high_links)} | Medium-risk: {len(med_links)} | Positive: {len(pos_links)} | Neutral: {len(neutral_links)}"

    neg_summary = (
        "Negative/Risk findings:\n" + "\n".join(
            f"- [{l['risk'].upper()}] \"{l['title']}\" — {l['source']}"
            + (f" ({l['date']})" if l.get("date") else "")
            + f"\n  {l['snippet']}"
            for l in neg_links[:8]
        )
        if neg_links else "No negative results found."
    )

    pos_summary = (
        "Positive findings:\n" + "\n".join(
            f"- \"{l['title']}\" — {l['source']}" + (f" ({l['date']})" if l.get("date") else "")
            for l in pos_links[:4]
        )
        if pos_links else "No positive results found."
    )

    prompt = (
        f'You are a senior analyst at a reputation management firm preparing an internal sales brief.\n\n'
        f'Subject: "{name}"\n{score_breakdown}\n\n{neg_summary}\n\n{pos_summary}\n\n'
        f"Return ONLY a JSON object with these 5 fields (no markdown, no explanation):\n"
        f'{{\n  "headline": "one sharp sentence summarising the reputational situation for the sales team",\n'
        f'  "issues": ["5-8 specific key reputation points — cite article titles or sources where relevant"],\n'
        f'  "talkingPoints": ["4-6 opening lines for the client meeting — reference their actual situation, not generic phrases"],\n'
        f'  "riskIndicators": ["4-6 concrete risk flags drawn from the findings above — include source name and date where available"],\n'
        f'  "objectionHandlers": ["4-5 sharp, specific rebuttals for when the prospect says they don\'t need reputation management — reference their actual findings"]\n'
        f"}}\n\nWrite all output in {language_name}."
    )

    try:
        response = await client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=8192,
            messages=[{"role": "user", "content": prompt}],
        )
        text_block = next((b for b in response.content if b.type == "text"), None)
        if text_block:
            json_match = re.search(r"\{[\s\S]*\}", text_block.text.strip())
            if json_match:
                return json.loads(json_match.group())
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


# ── Route ────────────────────────────────────────────────────────────────────

@router.post("")
async def generate_lead(
    body: GenerateLeadRequest,
    _analyst: WebAnalyst = Depends(get_current_web_analyst),
) -> dict:
    settings = get_settings()
    if not settings.anthropic_api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not configured")
    if not settings.serper_api_key:
        raise HTTPException(status_code=500, detail="SERPER_API_KEY not configured")

    countries: list[str] = (
        body.countries if body.countries and len(body.countries) > 0
        else ([body.country] if body.country else [])
    )
    if not countries or (body.useKeywords and not body.keywords):
        raise HTTPException(status_code=400, detail="Required fields missing")

    search_subject = (
        (body.company or "").strip() if body.subjectType == "company" and body.company
        else f"{(body.firstName or '').strip()} {(body.lastName or '').strip()}".strip()
    )
    sanitized_subject = search_subject[:200].replace("\r", " ").replace("\n", " ")

    primary_country = countries[0]
    country_code = _country_code(primary_country)
    language_code = COUNTRY_TO_LANGUAGE.get(country_code.upper()) if country_code else None

    output_language_name = (
        REPORT_LANG_MAP.get(body.reportLanguage, "English") if body.reportLanguage
        else LANG_CODE_TO_NAME.get(language_code or "", "English")
    )

    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

    async with httpx.AsyncClient() as http:
        # ── Phase 1: Serper searches ──────────────────────────────────────────
        search_queries = (
            [f"{sanitized_subject} {kw}" for kw in body.keywords]
            if body.useKeywords
            else [sanitized_subject]
        )

        country_configs = [
            {
                "country_code": _country_code(c),
                "language_code": COUNTRY_TO_LANGUAGE.get((_country_code(c) or "").upper()),
            }
            for c in countries
        ]

        all_searches = [
            {"q": q, "cc": cfg["country_code"], "lc": cfg["language_code"]}
            for q in search_queries
            for cfg in country_configs
        ]

        serper_results: list[tuple[list[dict], list[dict]]] = []
        for search in all_searches:
            if serper_results:
                await asyncio.sleep(0.3)
            serper_results.append(
                await _search_serper(
                    search["q"], search["cc"], search["lc"],
                    body.pagesCap or 2, settings.serper_api_key, http,
                )
            )

        all_organic = [r[0] for r in serper_results]
        all_raw = [r[1] for r in serper_results]

        # ── Phase 2: Deduplicate & scrape ─────────────────────────────────────
        seen_urls: set[str] = set()
        articles: list[dict] = []
        date_map: dict[str, str] = {}
        keyword_map: dict[str, list[str]] = {}
        country_map: dict[str, str] = {}
        num_countries = len(country_configs) or 1

        for kw_idx, results in enumerate(all_organic):
            country_idx = kw_idx % num_countries
            kw = body.keywords[kw_idx] if body.useKeywords and kw_idx < len(body.keywords) else None
            for r in results:
                url = r.get("link", "")
                if not url:
                    continue
                if url not in seen_urls:
                    seen_urls.add(url)
                    articles.append({"url": url, "title": r.get("title", ""), "snippet": r.get("snippet", ""), "content": r.get("snippet", "")})
                    if r.get("date"):
                        date_map[url] = r["date"]
                    if kw:
                        keyword_map[url] = [kw]
                    if country_idx < len(countries):
                        country_map[url] = countries[country_idx]
                elif kw and kw not in keyword_map.get(url, []):
                    keyword_map.setdefault(url, []).append(kw)

        urls_sent_to_firecrawl = [a["url"] for a in articles]

        BATCH_SIZE = 15
        scrape_results: list[str | None] = []
        for b_start in range(0, len(articles), BATCH_SIZE):
            if b_start > 0:
                await asyncio.sleep(0.5)
            batch = articles[b_start: b_start + BATCH_SIZE]
            batch_results = await asyncio.gather(
                *[
                    _scrape_firecrawl(a["url"], settings.firecrawl_api_key, http)
                    if not await _is_pdf(a["url"], http) and settings.firecrawl_api_key
                    else asyncio.coroutine(lambda: None)()
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

        urls_sent_to_claude = [a["url"] for a in articles]

    # ── Phase 3: Claude classification ───────────────────────────────────────
    classified = await _classify_with_claude(
        client, articles, sanitized_subject, countries,
        body.keywords, body.subjectType, output_language_name, body.scanFocus,
    )

    def sort_key(link: dict) -> tuple:
        ts = _parse_serper_date(link.get("date") or "")
        import math
        return (0, -ts) if not math.isnan(ts) else (1, 0)

    deduped = sorted(
        [
            {
                **link,
                "date": _to_english_date(date_map.get(link["url"])),
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

    summary = await _generate_meeting_summary(client, sanitized_subject, score, deduped, output_language_name)

    return {
        "links": deduped,
        "negative": negative,
        "positive": positive,
        "neutral": neutral,
        "summary": summary,
        "score": score,
        "_serper": [
            {
                "keyword": body.keywords[kw_idx] if body.useKeywords and kw_idx < len(body.keywords) else all_searches[i]["q"],
                "country": countries[i % num_countries] if i % num_countries < len(countries) else "unknown",
                "query": all_searches[i]["q"],
                "count": len(all_organic[i]) if i < len(all_organic) else 0,
                "links": [r.get("link") for page in (all_raw[i] if i < len(all_raw) else []) for r in page.get("organic", [])],
            }
            for i, kw_idx in enumerate(i // num_countries for i in range(len(all_searches)))
        ],
        "_firecrawl": (
            [
                {
                    "keyword": kw,
                    "sent": [u for u in urls_sent_to_firecrawl if kw in keyword_map.get(u, [])],
                    "success": [u for u in firecrawl_success if kw in keyword_map.get(u, [])],
                    "failed": [u for u in firecrawl_failed if kw in keyword_map.get(u, [])],
                }
                for kw in body.keywords
            ]
            if body.useKeywords
            else [{"keyword": None, "sent": urls_sent_to_firecrawl, "success": firecrawl_success, "failed": firecrawl_failed}]
        ),
        "_claude": (
            [
                {
                    "keyword": kw,
                    "sent": [u for u in urls_sent_to_claude if kw in keyword_map.get(u, [])],
                }
                for kw in body.keywords
            ]
            if body.useKeywords
            else [{"keyword": None, "sent": urls_sent_to_claude}]
        ),
    }
