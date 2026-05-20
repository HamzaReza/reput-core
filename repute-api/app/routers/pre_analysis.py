import asyncio
import json
import re
from typing import Literal

import anthropic
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.config import get_settings
from app.models.lead import WebAnalyst
from app.utils.auth import get_current_web_analyst

router = APIRouter(prefix="/pre-analysis", tags=["pre-analysis"])

NATIONALITY_ALIASES: dict[str, str] = {
    "american": "US", "australian": "AU", "austrian": "AT", "belgian": "BE",
    "brazilian": "BR", "british": "GB", "canadian": "CA", "chinese": "CN",
    "czech": "CZ", "danish": "DK", "dutch": "NL", "egyptian": "EG",
    "emirati": "AE", "finnish": "FI", "french": "FR", "german": "DE",
    "greek": "GR", "hungarian": "HU", "indian": "IN", "indonesian": "ID",
    "iranian": "IR", "irish": "IE", "israeli": "IL", "italian": "IT",
    "japanese": "JP", "korean": "KR", "malaysian": "MY", "mexican": "MX",
    "moroccan": "MA", "nigerian": "NG", "norwegian": "NO", "pakistani": "PK",
    "polish": "PL", "portuguese": "PT", "romanian": "RO", "russian": "RU",
    "saudi": "SA", "singaporean": "SG", "spanish": "ES", "swedish": "SE",
    "swiss": "CH", "thai": "TH", "turkish": "TR", "ukrainian": "UA",
    "uk": "GB", "united kingdom": "GB", "usa": "US", "united states": "US",
    "south korea": "KR", "turkey": "TR", "uae": "AE", "vietnam": "VN",
    "vietnamese": "VN",
}

COUNTRY_TO_LANGUAGE: dict[str, str] = {
    "IT": "it", "FR": "fr", "DE": "de", "ES": "es", "PT": "pt", "NL": "nl",
    "PL": "pl", "RO": "ro", "HU": "hu", "CZ": "cs", "RU": "ru", "UA": "uk",
    "TR": "tr", "JP": "ja", "KR": "ko", "CN": "zh-CN", "SA": "ar", "AE": "ar",
    "EG": "ar", "IN": "hi", "TH": "th", "VN": "vi", "ID": "id", "MY": "ms",
    "GR": "el", "SE": "sv", "NO": "no", "FI": "fi", "DK": "da",
    "GB": "en", "US": "en", "CA": "en", "AU": "en", "IE": "en",
}

LANGUAGE_CODE_TO_NAME: dict[str, str] = {
    "en": "English", "it": "Italian", "es": "Spanish", "fr": "French",
    "de": "German", "pt": "Portuguese", "nl": "Dutch", "pl": "Polish",
    "ro": "Romanian", "hu": "Hungarian", "cs": "Czech", "ru": "Russian",
    "uk": "Ukrainian", "tr": "Turkish", "ja": "Japanese", "ko": "Korean",
    "zh-CN": "Chinese", "ar": "Arabic", "hi": "Hindi", "th": "Thai",
    "vi": "Vietnamese", "id": "Indonesian", "ms": "Malay", "el": "Greek",
    "sv": "Swedish", "no": "Norwegian", "fi": "Finnish", "da": "Danish",
}

REPORT_LANG_MAP: dict[str, str] = {"en": "English", "it": "Italian", "es": "Spanish"}

FALLBACK_PROFILE = {
    "identity": "No public information found for this subject.",
    "background": "Either no public information found or the context provided is not enough to generate a profile.",
    "associations": "No known associations found in available sources.",
    "recent_news": "No recent news found in available sources.",
    "negative_findings": "No negative findings in available sources.",
    "positive_presence": "No positive coverage found in available sources.",
    "reputation_notes": "Insufficient data to assess reputation.",
}


def _country_code(country: str) -> str | None:
    k = country.lower().strip()
    return NATIONALITY_ALIASES.get(k)


class PreAnalysisRequest(BaseModel):
    firstName: str | None = None
    lastName: str | None = None
    company: str | None = None
    country: str | None = None
    countries: list[str] | None = None
    description: str = ""
    keywordsCap: int = 5
    keywordFocus: Literal["all", "negative", "positive", "neutral"] = "all"
    subjectType: Literal["individual", "company"] = "individual"
    reportLanguage: str | None = None


@router.post("")
async def pre_analysis(
    body: PreAnalysisRequest,
    _analyst: WebAnalyst = Depends(get_current_web_analyst),
) -> dict:
    settings = get_settings()
    if not settings.anthropic_api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not configured")

    countries: list[str] = (
        body.countries if body.countries and len(body.countries) > 0
        else ([body.country] if body.country else [])
    )
    if not countries:
        raise HTTPException(status_code=400, detail="At least one country is required.")
    if body.subjectType == "individual" and (not body.firstName or not body.lastName):
        raise HTTPException(status_code=400, detail="firstName and lastName are required for individual subjects.")
    if body.subjectType == "company" and not body.company:
        raise HTTPException(status_code=400, detail="company is required for company subjects.")

    country = countries[0]
    cap = min(8, max(3, body.keywordsCap or 5))
    country_code = _country_code(country)
    lang = COUNTRY_TO_LANGUAGE.get(country_code.upper()) if country_code else None
    language_name = (
        REPORT_LANG_MAP.get(body.reportLanguage, "English") if body.reportLanguage
        else LANGUAGE_CODE_TO_NAME.get(lang or "", "English")
    )

    full_name = f"{(body.firstName or '').strip()} {(body.lastName or '').strip()}".strip()
    subject_label = body.company if body.subjectType == "company" else full_name
    countries_label = ", ".join(countries)
    year = __import__("datetime").date.today().year

    no_name_instruction = (
        "Do NOT include the company name itself as a keyword."
        if body.subjectType == "company"
        else "Do NOT include the person's name."
    )

    keyword_focus_rules = {
        "negative": f"keywords: up to {cap} items (minimum 1) — ADVERSE terms only: legal disputes, fraud, misconduct, scandal, complaints, litigation. {no_name_instruction} All keywords in {language_name}.",
        "positive": f"keywords: up to {cap} items (minimum 1) — POSITIVE terms only: achievements, awards, leadership, philanthropy, recognition. {no_name_instruction} All keywords in {language_name}.",
        "neutral": f"keywords: up to {cap} items (minimum 1) — NEUTRAL factual terms only: role, organisation, sector, projects. {no_name_instruction} All keywords in {language_name}.",
        "all": f"keywords: up to {cap} items (minimum 1), 1-2 words each, balanced mix across positive, negative and neutral reputation angles. {no_name_instruction} All keywords in {language_name}.",
    }
    keyword_focus_rule = keyword_focus_rules.get(body.keywordFocus, keyword_focus_rules["all"])

    if body.subjectType == "company":
        search_system = (
            f"You are a senior investigative research analyst with web search access. Search thoroughly for public information about the company described. "
            f"Run multiple searches: company name alone, company name + country (run for each country listed: {countries_label}), company name + industry, "
            f"company name + legal or controversy keywords, company name + key executives, company name + news {year}. "
            f"For each search, look for: founding history and ownership, business model and revenue streams, key executives and leadership, "
            f"regulatory filings or sanctions, litigation or legal disputes, customer reviews or complaints, financial performance, industry reputation, "
            f"media coverage, partnerships and affiliations. Also explicitly search for the latest news — recent articles, press releases, announcements, "
            f"incidents, or developments from the past 12 months. Write a detailed, comprehensive factual summary covering all angles. Write in {language_name}."
        )
        search_content = (
            f"Research this company:\n\nCompany: {body.company}\nCountry: {countries_label}"
            + (f"\nContext: {body.description.strip()}" if body.description.strip() else "")
        )
        format_identity_hint = "<2-3 sentences: company name, industry, country of origin, area of operation, size or scale indicator>"
        format_background_hint = "<5-7 sentences: founding story, business model, growth trajectory, key products or services, market position, major clients or partnerships, geographic reach>"
        format_associations_hint = "<3-5 sentences: parent company or subsidiaries, key investors or shareholders, notable clients or partners, industry associations, executive network>"
    else:
        search_system = (
            f"You are a senior investigative research analyst with web search access. Search thoroughly for public information about the person described. "
            f"Run multiple searches: full name alone, name + company, name + each country ({countries_label}), name + industry, "
            f"name + legal or controversy keywords, name + news {year}. "
            f"For each search, look for: career history and current role, educational background, company affiliations and business ventures, "
            f"legal proceedings or regulatory actions, media mentions and interviews, social media presence, awards or public recognition, "
            f"controversies or allegations, known associates and partners. Also explicitly search for the latest news — recent articles, interviews, "
            f"public statements, incidents, or developments involving this person from the past 12 months. "
            f"Write a detailed, comprehensive factual summary covering all angles. Write in {language_name}."
        )
        search_content = (
            f"Research this person:\n\nName: {full_name}"
            + (f"\nCompany: {body.company}" if body.company else "")
            + f"\nCountry: {countries_label}"
            + (f"\nContext: {body.description.strip()}" if body.description.strip() else "")
        )
        format_identity_hint = "<2-3 sentences: full name, known professional roles, nationality, geographic base, industry sector>"
        format_background_hint = "<5-7 sentences: career arc from early career to present, key employers, roles held, major projects or deals, educational background if known, industry standing>"
        format_associations_hint = "<3-5 sentences: known business partners, employers, investors, political or professional affiliations, notable co-founders or collaborators, family business connections>"

    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
    profile = dict(FALLBACK_PROFILE)
    keywords: list[str] = []

    try:
        messages: list[dict] = [{"role": "user", "content": search_content}]
        search_msg = None
        for _turn in range(10):
            search_msg = await client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=16000,
                system=search_system,
                tools=[{"type": "web_search_20260209", "name": "web_search"}],  # type: ignore[list-item]
                messages=messages,  # type: ignore[arg-type]
            )
            if search_msg.stop_reason == "end_turn":
                break
            messages.append({"role": "assistant", "content": search_msg.content})  # type: ignore[arg-type]

        research_summary = "\n".join(
            block.text for block in (search_msg.content if search_msg else [])
            if block.type == "text"
        ).strip()

        if not research_summary:
            print(f"[pre-analysis] empty summary — stop_reason={search_msg.stop_reason if search_msg else 'none'}, block_types={[b.type for b in search_msg.content] if search_msg else []}")
            return {"profile": profile, "keywords": keywords}

        format_msg = await client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=2048,
            system=f"You are a data formatter. Convert the research summary into the specified JSON shape. Write ALL field values and ALL keywords in {language_name}. Output ONLY valid JSON — no markdown fences, no explanation, no extra keys.",
            messages=[
                {
                    "role": "user",
                    "content": (
                        f"Research summary about {subject_label}:\n{research_summary}\n\n"
                        f"Return ONLY this JSON (no explanation, no markdown):\n"
                        f'{{\n  "profile": {{\n'
                        f'    "identity": "{format_identity_hint}",\n'
                        f'    "background": "{format_background_hint}",\n'
                        f'    "associations": "{format_associations_hint}",\n'
                        f'    "recent_news": "<3-6 sentences: latest news, articles, announcements, incidents, or developments from the past 12 months — include dates where available; if none found write \'No recent news found in available sources\'>",\n'
                        f'    "negative_findings": "<4-8 sentences: legal proceedings, regulatory sanctions, fraud allegations, controversies, scandals, complaints — include dates and specifics where available; if none write \'No negative findings in available sources\'>",\n'
                        f'    "positive_presence": "<3-6 sentences: awards, recognitions, successful ventures, positive media coverage, industry leadership, philanthropic activities>",\n'
                        f'    "reputation_notes": "<2-4 sentences: overall reputational standing, key risk indicators, public perception summary, recommended scrutiny level>"\n'
                        f'  }},\n  "keywords": ["<keyword1>", ...]\n}}\n'
                        f"Rules: every field fully populated with detail, based only on the summary above, {keyword_focus_rule}"
                    ),
                }
            ],
        )

        text_block = next((b for b in format_msg.content if b.type == "text"), None)
        if text_block:
            json_match = re.search(r"\{[\s\S]*\}", text_block.text.strip())
            if json_match:
                parsed = json.loads(json_match.group())
                profile = parsed.get("profile", profile)
                raw_kw = parsed.get("keywords", [])
                keywords = raw_kw[:cap] if isinstance(raw_kw, list) else []

    except Exception as e:
        print(f"[pre-analysis] error: {e}")

    return {"profile": profile, "keywords": keywords}
