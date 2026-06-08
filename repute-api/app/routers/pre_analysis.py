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
    "american": "US",
    "australian": "AU",
    "austrian": "AT",
    "belgian": "BE",
    "brazilian": "BR",
    "british": "GB",
    "canadian": "CA",
    "chinese": "CN",
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
    "irish": "IE",
    "israeli": "IL",
    "italian": "IT",
    "japanese": "JP",
    "korean": "KR",
    "malaysian": "MY",
    "mexican": "MX",
    "moroccan": "MA",
    "nigerian": "NG",
    "norwegian": "NO",
    "pakistani": "PK",
    "polish": "PL",
    "portuguese": "PT",
    "romanian": "RO",
    "russian": "RU",
    "saudi": "SA",
    "singaporean": "SG",
    "spanish": "ES",
    "swedish": "SE",
    "swiss": "CH",
    "thai": "TH",
    "turkish": "TR",
    "ukrainian": "UA",
    "uk": "GB",
    "united kingdom": "GB",
    "usa": "US",
    "united states": "US",
    "south korea": "KR",
    "turkey": "TR",
    "uae": "AE",
    "vietnam": "VN",
    "vietnamese": "VN",
}

COUNTRY_TO_LANGUAGE: dict[str, str] = {
    "IT": "it",
    "FR": "fr",
    "DE": "de",
    "ES": "es",
    "PT": "pt",
    "NL": "nl",
    "PL": "pl",
    "RO": "ro",
    "HU": "hu",
    "CZ": "cs",
    "RU": "ru",
    "UA": "uk",
    "TR": "tr",
    "JP": "ja",
    "KR": "ko",
    "CN": "zh-CN",
    "SA": "ar",
    "AE": "ar",
    "EG": "ar",
    "IN": "hi",
    "TH": "th",
    "VN": "vi",
    "ID": "id",
    "MY": "ms",
    "GR": "el",
    "SE": "sv",
    "NO": "no",
    "FI": "fi",
    "DK": "da",
    "GB": "en",
    "US": "en",
    "CA": "en",
    "AU": "en",
    "IE": "en",
}

LANGUAGE_CODE_TO_NAME: dict[str, str] = {
    "en": "English",
    "it": "Italian",
    "es": "Spanish",
    "fr": "French",
    "de": "German",
    "pt": "Portuguese",
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
    "zh-CN": "Chinese (Simplified)",
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
    # Extended set — distinct languages of generate_lead._COUNTRY_TO_LANGUAGE
    # (the languages the scan pipeline can search in).
    "af": "Afrikaans",
    "am": "Amharic",
    "az": "Azerbaijani",
    "be": "Belarusian",
    "bg": "Bulgarian",
    "bn": "Bengali",
    "bs": "Bosnian",
    "ca": "Catalan",
    "dv": "Dhivehi",
    "dz": "Dzongkha",
    "et": "Estonian",
    "fa": "Persian",
    "he": "Hebrew",
    "hr": "Croatian",
    "ht": "Haitian Creole",
    "hy": "Armenian",
    "is": "Icelandic",
    "ka": "Georgian",
    "kk": "Kazakh",
    "km": "Khmer",
    "ky": "Kyrgyz",
    "lo": "Lao",
    "lt": "Lithuanian",
    "lv": "Latvian",
    "mg": "Malagasy",
    "mk": "Macedonian",
    "mn": "Mongolian",
    "mt": "Maltese",
    "my": "Burmese",
    "ne": "Nepali",
    "ny": "Chichewa",
    "ps": "Pashto",
    "pt-BR": "Portuguese (Brazil)",
    "rw": "Kinyarwanda",
    "si": "Sinhala",
    "sk": "Slovak",
    "sl": "Slovenian",
    "sm": "Samoan",
    "so": "Somali",
    "sq": "Albanian",
    "sr": "Serbian",
    "st": "Sesotho",
    "sw": "Swahili",
    "tg": "Tajik",
    "ti": "Tigrinya",
    "tk": "Turkmen",
    "tl": "Filipino",
    "to": "Tongan",
    "ur": "Urdu",
    "uz": "Uzbek",
    "zh-TW": "Chinese (Traditional)",
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


def _build_estimate(neg: dict | None) -> dict:
    """Normalise the negative-estimation call's output into the response shape.
    Uses observed domain count directly — no arbitrary multiplier.
    Zero domains found — reports 0,0 (no invented coverage)."""
    neg = neg or {}
    assessment = neg.get("coverage_assessment", "minimal")
    domains = neg.get("distinct_negative_sources_seen") or 0
    saturation = neg.get("saturation", "unknown")
    confidence = neg.get("confidence", "low")

    if domains == 0:
        low, high = 0, 0
    else:
        low = int(domains * 3)
        high = int(domains * 10)

    return {
        "coverage_assessment": assessment,
        "confidence": confidence,
        "distinct_negative_sources_seen": domains,
        "saturation": saturation,
        "low": low,
        "high": high,
        "reasoning": neg.get("reasoning", "Estimate based on observed sources."),
    }


def _country_code(country: str) -> str | None:
    k = country.lower().strip()
    return NATIONALITY_ALIASES.get(k)


class PreAnalysisRequest(BaseModel):
    firstName: str | None = None
    middleName: str | None = None
    lastName: str | None = None
    company: str | None = None
    country: str | None = None
    countries: list[str] | None = None
    description: str = ""
    keywordsCap: int = 5
    keywordFocus: Literal["all", "negative", "positive", "neutral"] = "all"
    keywordLength: int | None = None  # 1, 2, or 3 words; None = no constraint
    subjectType: Literal["individual", "company"] = "individual"
    reportLanguage: str | None = None
    keywordLanguages: list[str] | None = (
        None  # ISO codes; keywords generated per language
    )
    scanTier: Literal["standard", "advanced"] = "standard"


@router.post("")
async def pre_analysis(
    body: PreAnalysisRequest,
    _analyst: WebAnalyst = Depends(get_current_web_analyst),
) -> dict:
    settings = get_settings()
    if not settings.anthropic_api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not configured")

    countries: list[str] = (
        body.countries
        if body.countries and len(body.countries) > 0
        else ([body.country] if body.country else [])
    )
    if not countries:
        raise HTTPException(status_code=400, detail="At least one country is required.")
    if body.subjectType == "individual" and (not body.firstName or not body.lastName):
        raise HTTPException(
            status_code=400,
            detail="firstName and lastName are required for individual subjects.",
        )
    if body.subjectType == "company" and not body.company:
        raise HTTPException(
            status_code=400, detail="company is required for company subjects."
        )

    model = (
        "claude-haiku-4-5-20251001"
        if body.scanTier == "standard"
        else "claude-sonnet-4-6"
    )
    # web_search_tool = "web_search_20250305" if body.scanTier == "standard" else "web_search_20260209"
    web_search_tool = "web_search_20250305"

    country = countries[0]
    cap = min(8, max(3, body.keywordsCap or 5))
    country_code = _country_code(country)
    lang = COUNTRY_TO_LANGUAGE.get(country_code.upper()) if country_code else None
    language_name = (
        REPORT_LANG_MAP.get(body.reportLanguage, "English")
        if body.reportLanguage
        else LANGUAGE_CODE_TO_NAME.get(lang or "", "English")
    )

    # Explicit keyword languages (max 5); empty list = single-language behavior
    # driven by language_name above.
    kw_lang_names: list[str] = []
    if body.keywordLanguages:
        for code in body.keywordLanguages:
            name = LANGUAGE_CODE_TO_NAME.get(code)
            if name and name not in kw_lang_names:
                kw_lang_names.append(name)
        kw_lang_names = kw_lang_names[:5]

    full_name = (
        f"{(body.firstName or '').strip()} {(body.lastName or '').strip()}".strip()
    )
    subject_label = body.company if body.subjectType == "company" else full_name
    countries_label = ", ".join(countries)
    year = __import__("datetime").date.today().year

    no_name_instruction = (
        "Do NOT include the company name itself as a keyword."
        if body.subjectType == "company"
        else "Do NOT include the person's name."
    )

    no_underscore_instruction = (
        " Separate words with normal spaces — NEVER join words with underscores or hyphens; "
        "if a concept does not fit the preferred length in a language, use a natural phrase "
        "of up to 3 words instead of compressing it."
    )
    if body.keywordLength == 1:
        word_count_instruction = (
            "each keyword should be 1 word where possible." + no_underscore_instruction
        )
    elif body.keywordLength == 2:
        word_count_instruction = (
            "each keyword should be 2 words where possible." + no_underscore_instruction
        )
    elif body.keywordLength == 3:
        word_count_instruction = (
            "each keyword should be 3 words where possible." + no_underscore_instruction
        )
    else:
        word_count_instruction = "1-3 words each." + no_underscore_instruction

    if kw_lang_names:
        keyword_count_clause = (
            f"up to {cap} items PER LANGUAGE (minimum 1 per language)"
        )
        keyword_language_clause = (
            f"Generate keywords for EACH of these languages: {', '.join(kw_lang_names)}. "
            f"Keywords must be native-quality search terms in each language — express the "
            f"underlying concepts idiomatically, not as literal word-for-word translations."
        )
    else:
        keyword_count_clause = f"up to {cap} items (minimum 1)"
        keyword_language_clause = f"All keywords in {language_name}."

    keyword_focus_rules = {
        "negative": f"keywords: {keyword_count_clause}, {word_count_instruction} ADVERSE terms only: legal disputes, fraud, misconduct, scandal, complaints, litigation. {no_name_instruction} {keyword_language_clause}",
        "positive": f"keywords: {keyword_count_clause}, {word_count_instruction} POSITIVE terms only: achievements, awards, leadership, philanthropy, recognition. {no_name_instruction} {keyword_language_clause}",
        "neutral": f"keywords: {keyword_count_clause}, {word_count_instruction} NEUTRAL factual terms only: role, organisation, sector, projects. {no_name_instruction} {keyword_language_clause}",
        "all": f"keywords: {keyword_count_clause}, {word_count_instruction} balanced mix across positive, negative and neutral reputation angles. {no_name_instruction} {keyword_language_clause}",
    }
    keyword_focus_rule = keyword_focus_rules.get(
        body.keywordFocus, keyword_focus_rules["all"]
    )

    # ── Search call (main research summary) ──────────────────────────────────
    if body.subjectType == "company":
        search_system = (
            f"You are a senior investigative research analyst with web search access. Search thoroughly for public information about the company described. "
            f"Run multiple searches: company name alone, company name + country (run for each country listed: {countries_label}), company name + industry, "
            f"company name + legal or controversy keywords, company name + key executives, company name + news {year}. "
            f"For each search, look for: founding history and ownership, business model and revenue streams, key executives and leadership, "
            f"regulatory filings or sanctions, litigation or legal disputes, customer reviews or complaints, financial performance, industry reputation, "
            f"media coverage, partnerships and affiliations. Also explicitly search for the latest news — recent articles, press releases, announcements, "
            f"incidents, or developments from the past 12 months. Write a detailed, comprehensive factual summary covering all angles. Write in {language_name}. "
            f"At the very end of your summary, add one line in exactly this format (do not translate it): "
            f"SEARCH_QUERIES_USED: query1 | query2 | query3 | ... — list every search query you actually ran."
        )
        search_content = (
            f"Research this company:\n\nCompany: {body.company}\nCountry: {countries_label}"
            + (
                f"\nContext: {body.description.strip()}"
                if body.description.strip()
                else ""
            )
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
            f"Write a detailed, comprehensive factual summary covering all angles. Write in {language_name}. "
            f"At the very end of your summary, add one line in exactly this format (do not translate it): "
            f"SEARCH_QUERIES_USED: query1 | query2 | query3 | ... — list every search query you actually ran."
        )
        search_content = (
            f"Research this person:\n\nName: {full_name}"
            + (f"\nCompany: {body.company}" if body.company else "")
            + f"\nCountry: {countries_label}"
            + (
                f"\nContext: {body.description.strip()}"
                if body.description.strip()
                else ""
            )
        )
        format_identity_hint = "<2-3 sentences: full name, known professional roles, nationality, geographic base, industry sector>"
        format_background_hint = "<5-7 sentences: career arc from early career to present, key employers, roles held, major projects or deals, educational background if known, industry standing>"
        format_associations_hint = "<3-5 sentences: known business partners, employers, investors, political or professional affiliations, notable co-founders or collaborators, family business connections>"

    # ── Negative estimation call (dedicated adverse search) ───────────────────
    subject_prefix = (
        f"Company: {body.company}"
        if body.subjectType == "company"
        else f"Name: {full_name}"
    )
    adverse_context = body.description.strip()

    neg_system = (
        "You are a negative coverage analyst. Your sole task is to find adverse, negative, or critical "
        "content about the subject using web search. "
        "Run 8-10 searches using different combinations of: the subject's name/identifier, "
        "the adverse context terms provided, country names, and relevant adverse keywords such as "
        "fraud, lawsuit, investigation, sanction, scandal, allegations, war crimes, corruption, "
        "criminal, indictment, controversy. "
        "Use the adverse context as your primary guide for which angles to search — "
        "those are the terms the client has flagged as relevant. "
        "After completing all searches, output ONLY a single JSON object — no explanation, no prose, no markdown fences:\n"
        '{"coverage_assessment": "minimal|low|moderate|substantial|extensive", '
        '"confidence": "low|medium|high", '
        '"distinct_negative_sources_seen": <integer: count of distinct domains/URLs carrying negative material you actually observed across all searches>, '
        '"saturation": "saturated|unsaturated", '
        '"reasoning": "<2-3 sentences: which angles you searched, how many distinct negative sources appeared, '
        f'and whether new sources kept appearing in later queries (unsaturated) or results kept repeating (saturated)>"}}\n'
        f"Write the reasoning field in {language_name}.\n"
        "\nDefinitions to apply consistently:\n"
        "coverage_assessment — "
        "minimal: 0–50 negative sources, very little adverse material found; "
        "low: 50–100 sources, limited adverse coverage across a handful of outlets; "
        "moderate: 101–500 sources, clear adverse coverage across multiple outlets; "
        "substantial: 501–1000 sources, recurring adverse coverage across many distinct sources; "
        "extensive: more than 1000 sources, pervasive adverse coverage still surfacing new sources in later queries.\n"
        "saturation — saturated: later queries returned mostly sources already seen; "
        "unsaturated: each new query kept surfacing fresh distinct negative sources.\n"
        "confidence — how much the search results actually support the assessment: "
        "low if few searches returned results or the topic is obscure; "
        "medium if coverage is clear but incomplete; high if results were consistently dense and varied."
    )
    neg_content = (
        f"Find all negative coverage about this subject:\n\n"
        f"{subject_prefix}\n"
        f"Countries: {countries_label}\n"
        f"Adverse context: {adverse_context if adverse_context else 'None provided — search broadly for any negative material.'}"
    )

    # ── Parallel execution: research summary + negative estimation ────────────
    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
    profile = dict(FALLBACK_PROFILE)
    keywords: list[str] = []
    neg_links: dict | None = None

    try:
        print(
            f"[pre-analysis] starting parallel calls for: {subject_label!r} | countries={countries}"
        )

        search_result, neg_result = await asyncio.gather(
            client.messages.create(
                model=model,
                max_tokens=16000,
                system=search_system,
                tools=[{"type": web_search_tool, "name": "web_search", "max_uses": 12}],  # type: ignore[list-item]
                messages=[{"role": "user", "content": search_content}],
            ),
            client.messages.create(
                model=model,
                max_tokens=8096,
                system=neg_system,
                tools=[{"type": web_search_tool, "name": "web_search", "max_uses": 10}],  # type: ignore[list-item]
                messages=[{"role": "user", "content": neg_content}],
            ),
            return_exceptions=True,
        )

        # ── Handle search result ──────────────────────────────────────────────
        if isinstance(search_result, Exception):
            raise search_result

        search_msg = search_result
        print(
            f"[pre-analysis] search done — stop_reason={search_msg.stop_reason!r} | blocks={[b.type for b in search_msg.content]}"
        )
        for i, block in enumerate(search_msg.content):
            if block.type == "text":
                print(
                    f"[pre-analysis] text block[{i}] (first 300 chars): {block.text[:300]!r}"
                )
            else:
                print(f"[pre-analysis] non-text block[{i}]: type={block.type!r}")

        research_summary = "\n".join(
            block.text for block in search_msg.content if block.type == "text"
        ).strip()

        search_queries_used: list[str] = []
        queries_match = re.search(
            r"SEARCH_QUERIES_USED:\s*(.+)$", research_summary, re.MULTILINE
        )
        if queries_match:
            search_queries_used = [
                q.strip() for q in queries_match.group(1).split("|") if q.strip()
            ]
            research_summary = research_summary[: queries_match.start()].strip()

        if not research_summary:
            print("[pre-analysis] EMPTY SUMMARY — returning fallback")
            profile["estimated_negative_links"] = _build_estimate(None)
            return {"profile": profile, "keywords": keywords}

        # ── Handle negative estimation result ─────────────────────────────────
        if isinstance(neg_result, Exception):
            print(
                f"[pre-analysis] negative estimation failed (non-fatal): {neg_result}"
            )
        else:
            neg_msg = neg_result
            print(
                f"[pre-analysis] neg estimation done — stop_reason={neg_msg.stop_reason!r}"
            )
            neg_text = "\n".join(
                block.text for block in neg_msg.content if block.type == "text"
            ).strip()

            if neg_text:
                # Try direct parse first, then fall back to regex extraction
                try:
                    neg_links = json.loads(neg_text)
                except json.JSONDecodeError:
                    m = re.search(r"\{[\s\S]*\}", neg_text)
                    if m:
                        try:
                            neg_links = json.loads(m.group())
                        except Exception as inner_err:
                            print(f"[pre-analysis] neg JSON parse failed: {inner_err}")
            else:
                print(
                    "[pre-analysis] negative estimation returned no text — using minimal fallback"
                )

        # ── Format call: profile + keywords only ──────────────────────────────
        print(
            f"[pre-analysis] research_summary length={len(research_summary)} chars — proceeding to format"
        )

        queries_section = (
            "\n\nSearch queries actually executed during research:\n"
            + "\n".join(f"- {q}" for q in search_queries_used)
            if search_queries_used
            else ""
        )
        if search_queries_used and kw_lang_names:
            keywords_instruction = (
                f"{keyword_focus_rule} "
                f"Derive the keyword concepts strictly from the search queries listed above, "
                f"then express each concept natively in every requested language. "
                f"Do NOT invent keywords that were not part of the actual research."
            )
        elif search_queries_used:
            keywords_instruction = (
                f"{keyword_focus_rule} "
                f"Derive keywords strictly from the search queries listed above — "
                f"use the actual terms that were searched, not words extracted from the summary prose. "
                f"Do NOT invent keywords that were not part of the actual research."
            )
        else:
            keywords_instruction = keyword_focus_rule

        if kw_lang_names:
            format_language_instruction = (
                f"Write ALL profile field values in {language_name}. "
                f"Write each keyword group in its own language as specified."
            )
            kw_groups = ", ".join(
                f'"{lang_name}": ["<keyword1>", ...]' for lang_name in kw_lang_names
            )
            keywords_shape = f'  "keywords": {{{kw_groups}}}\n}}\n'
        else:
            format_language_instruction = (
                f"Write ALL field values and ALL keywords in {language_name}."
            )
            keywords_shape = '  "keywords": ["<keyword1>", ...]\n}\n'

        format_msg = await client.messages.create(
            model=model,
            max_tokens=16000,
            system=(
                f"You are a data formatter. Convert the research summary into the specified JSON shape. "
                f"{format_language_instruction} "
                f"Output ONLY valid JSON — no markdown fences, no explanation, no extra keys."
            ),
            messages=[
                {
                    "role": "user",
                    "content": (
                        f"Research summary about {subject_label}:\n{research_summary}{queries_section}\n\n"
                        f"Return ONLY this JSON (no explanation, no markdown):\n"
                        f'{{\n  "profile": {{\n'
                        f'    "identity": "{format_identity_hint}",\n'
                        f'    "background": "{format_background_hint}",\n'
                        f'    "associations": "{format_associations_hint}",\n'
                        f'    "recent_news": "<3-6 sentences: latest news, articles, announcements, incidents, or developments from the past 12 months — include dates where available; if none found write \'No recent news found in available sources\'>",\n'
                        f'    "negative_findings": "<4-8 sentences: legal proceedings, regulatory sanctions, fraud allegations, controversies, scandals, complaints — include dates and specifics where available; if none write \'No negative findings in available sources\'>",\n'
                        f'    "positive_presence": "<3-6 sentences: awards, recognitions, successful ventures, positive media coverage, industry leadership, philanthropic activities>",\n'
                        f'    "reputation_notes": "<2-4 sentences: overall reputational standing, key risk indicators, public perception summary, recommended scrutiny level>"\n'
                        f"  }},\n"
                        + keywords_shape
                        + f"Rules: every field fully populated with detail, based only on the summary above, {keywords_instruction}."
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

                def _clean_kw(k: object) -> str:
                    # Models sometimes snake_case multi-word terms to satisfy
                    # word-count constraints — normalise back to spaces.
                    return str(k).replace("_", " ").strip()

                if kw_lang_names and isinstance(raw_kw, dict):
                    flat: list[str] = []
                    for lang_name in kw_lang_names:  # preserve selection order
                        group = raw_kw.get(lang_name)
                        if isinstance(group, list):
                            flat.extend(_clean_kw(k) for k in group[:cap])
                    if not flat:  # model used unexpected group keys
                        for group in raw_kw.values():
                            if isinstance(group, list):
                                flat.extend(_clean_kw(k) for k in group[:cap])
                    seen_kw: set[str] = set()
                    keywords = [
                        k for k in flat if not (k in seen_kw or seen_kw.add(k))
                    ][: cap * len(kw_lang_names)]
                elif isinstance(raw_kw, list):
                    # single-language request, or the model ignored grouping
                    keywords = [
                        _clean_kw(k) for k in raw_kw[: cap * max(1, len(kw_lang_names))]
                    ]
                else:
                    keywords = []

    except Exception as e:
        import traceback

        print(f"[pre-analysis] EXCEPTION: {e}")
        print(traceback.format_exc())

    # Inject the estimate on every return path — success, format failure, or exception.
    if "estimated_negative_links" not in profile:
        profile["estimated_negative_links"] = _build_estimate(neg_links)

    return {"profile": profile, "keywords": keywords}
