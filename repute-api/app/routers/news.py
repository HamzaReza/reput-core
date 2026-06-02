import asyncio
import base64
import datetime
import json
import random
import re
import time
import uuid
from datetime import timezone
from typing import AsyncGenerator, Literal

import anthropic
import feedparser
import httpx
from bs4 import BeautifulSoup
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.models.lead import WebAnalyst
from app.models.news import NewsAgent, NewsDraft, NewsPublished, NewsRules, NewsSource, NewsWPConfig
from app.utils.auth import get_current_web_analyst

router = APIRouter(prefix="/news", tags=["news"])


# ── Pydantic models — AI proxy routes ────────────────────────────────────────


class RewriteConfig(BaseModel):
    articleText: str
    testataNome: str
    agenteId: str | None = None
    agentePrompt: str | None = None
    lunghezza: str
    lingua: str
    mantieniTitolo: bool
    mode: Literal["rewrite", "brief"] = "rewrite"
    briefText: str | None = None
    tipoArticolo: str | None = None


class FetchArticleRequest(BaseModel):
    url: str


class ParseRssRequest(BaseModel):
    url: str


class RssItem(BaseModel):
    title: str | None = None
    link: str | None = None
    pubDate: str | None = None
    contentSnippet: str | None = None


class ProcessArticleRequest(BaseModel):
    url: str
    sourceName: str
    originalTitle: str
    snippet: str | None = None
    testataNome: str | None = None
    agentePrompt: str | None = None
    lunghezza: str | None = None
    lingua: str | None = None


class AlternativeImage(BaseModel):
    thumbnailUrl: str
    source: str
    license: str
    attribution: str
    relevanceScore: float


class AIDraft(BaseModel):
    id: str
    originalSource: str
    originalUrl: str
    originalTitle: str
    originalExcerpt: str
    originalPublishedAt: str
    generatedKicker: str
    generatedTitle: str
    generatedSubtitle: str
    generatedBodyPreview: str
    generatedBody: str
    generatedSeoTitle: str
    generatedMetaDescription: str
    generatedSlug: str
    generatedTags: list[str]
    generatedCategory: str
    generatedCity: str
    coverImageUrl: str
    coverImageStatus: str
    coverImageSource: str
    coverImageLicense: str
    coverImageAttribution: str
    imageSearchQuery: str
    imageAltText: str
    imageCaption: str
    alternativeImages: list[AlternativeImage]
    priorityScore: int
    priorityReasons: list[str]
    status: str
    isBreaking: bool


class WPTestRequest(BaseModel):
    siteUrl: str
    username: str
    appPassword: str


class WPPublishRequest(BaseModel):
    siteUrl: str
    username: str
    appPassword: str
    title: str
    content: str
    excerpt: str | None = None
    tags: list[str] | None = None
    category: str | None = None
    status: Literal["draft", "publish"]
    slug: str | None = None


# ── Pydantic models — CRUD ────────────────────────────────────────────────────


class NewsSourceCreate(BaseModel):
    name: str
    url: str
    type: str = "RSS"
    state: str = "active"
    category: str | None = None
    city_filter: str | None = None


class NewsAgentCreate(BaseModel):
    name: str
    target_category: str
    model: str = "Claude Haiku"
    temperature: float = 0.7
    language: str = "English"
    prompt: str


class NewsDraftCreate(BaseModel):
    original_source: str
    original_url: str
    original_title: str
    original_excerpt: str = ""
    original_published_at: str = ""
    generated_kicker: str = ""
    generated_title: str = ""
    generated_subtitle: str = ""
    generated_body_preview: str = ""
    generated_body: str = ""
    generated_seo_title: str = ""
    generated_meta_description: str = ""
    generated_slug: str = ""
    generated_tags: list[str] = []
    generated_category: str = ""
    generated_city: str = ""
    cover_image_url: str = ""
    cover_image_status: str = "Not selected"
    cover_image_source: str = "Unsplash"
    cover_image_license: str = ""
    cover_image_attribution: str = ""
    image_search_query: str = ""
    image_alt_text: str = ""
    image_caption: str = ""
    alternative_images: list[dict] = []
    priority_score: int = 0
    priority_reasons: list[str] = []
    status: str = "AI Draft"
    is_breaking: bool = False


class NewsDraftUpdate(BaseModel):
    generated_title: str | None = None
    generated_body: str | None = None
    generated_body_preview: str | None = None
    generated_kicker: str | None = None
    generated_subtitle: str | None = None
    generated_seo_title: str | None = None
    generated_meta_description: str | None = None
    generated_slug: str | None = None
    generated_tags: list[str] | None = None
    generated_category: str | None = None
    generated_city: str | None = None
    cover_image_url: str | None = None
    cover_image_status: str | None = None
    cover_image_source: str | None = None
    cover_image_license: str | None = None
    cover_image_attribution: str | None = None
    image_search_query: str | None = None
    image_alt_text: str | None = None
    image_caption: str | None = None
    alternative_images: list[dict] | None = None
    priority_score: int | None = None
    priority_reasons: list[str] | None = None
    status: str | None = None
    is_breaking: bool | None = None


class NewsRulesPayload(BaseModel):
    autopilot: bool = True
    urgent_mode: bool = False
    rss_frequency: str = "Every 15 minutes"
    source_rotation: int = 3
    smart_tags: str = ""
    requires_manual_approval: bool = True
    sensitive_word_filter: bool = True


class NewsWPConfigPayload(BaseModel):
    site_url: str = ""
    username: str = ""
    app_password: str = ""
    default_category: str = "News"
    default_status: str = "draft"


# ── Serializers ───────────────────────────────────────────────────────────────


def _s(o: NewsSource) -> dict:
    return {
        "id": str(o.id), "name": o.name, "url": o.url, "type": o.type,
        "state": o.state, "category": o.category, "city_filter": o.city_filter,
        "created_by_id": str(o.created_by_id) if o.created_by_id else None,
        "created_at": o.created_at.isoformat() if o.created_at else None,
    }


def _a(o: NewsAgent) -> dict:
    return {
        "id": str(o.id), "name": o.name, "target_category": o.target_category,
        "model": o.model, "temperature": o.temperature, "language": o.language,
        "prompt": o.prompt,
        "created_by_id": str(o.created_by_id) if o.created_by_id else None,
        "created_at": o.created_at.isoformat() if o.created_at else None,
    }


def _d(o: NewsDraft) -> dict:
    return {
        "id": str(o.id),
        "original_source": o.original_source, "original_url": o.original_url,
        "original_title": o.original_title, "original_excerpt": o.original_excerpt,
        "original_published_at": o.original_published_at,
        "generated_kicker": o.generated_kicker, "generated_title": o.generated_title,
        "generated_subtitle": o.generated_subtitle,
        "generated_body_preview": o.generated_body_preview, "generated_body": o.generated_body,
        "generated_seo_title": o.generated_seo_title,
        "generated_meta_description": o.generated_meta_description,
        "generated_slug": o.generated_slug, "generated_tags": o.generated_tags,
        "generated_category": o.generated_category, "generated_city": o.generated_city,
        "cover_image_url": o.cover_image_url, "cover_image_status": o.cover_image_status,
        "cover_image_source": o.cover_image_source, "cover_image_license": o.cover_image_license,
        "cover_image_attribution": o.cover_image_attribution,
        "image_search_query": o.image_search_query, "image_alt_text": o.image_alt_text,
        "image_caption": o.image_caption, "alternative_images": o.alternative_images,
        "priority_score": o.priority_score, "priority_reasons": o.priority_reasons,
        "status": o.status, "is_breaking": o.is_breaking,
        "created_by_id": str(o.created_by_id) if o.created_by_id else None,
        "created_at": o.created_at.isoformat() if o.created_at else None,
        "updated_at": o.updated_at.isoformat() if o.updated_at else None,
    }


def _p(o: NewsPublished) -> dict:
    return {
        "id": str(o.id), "title": o.title, "source_name": o.source_name,
        "published_at": o.published_at, "category": o.category,
        "word_count": o.word_count, "original_url": o.original_url,
        "draft_id": str(o.draft_id) if o.draft_id else None,
        "created_by_id": str(o.created_by_id) if o.created_by_id else None,
        "created_at": o.created_at.isoformat() if o.created_at else None,
    }


def _r(o: NewsRules) -> dict:
    return {
        "id": str(o.id), "autopilot": o.autopilot,
        "urgent_mode": o.urgent_mode, "rss_frequency": o.rss_frequency,
        "source_rotation": o.source_rotation, "smart_tags": o.smart_tags,
        "requires_manual_approval": o.requires_manual_approval,
        "sensitive_word_filter": o.sensitive_word_filter,
        "updated_at": o.updated_at.isoformat() if o.updated_at else None,
    }


def _w(o: NewsWPConfig, mask: bool = True) -> dict:
    pwd = o.app_password
    if mask and pwd:
        pwd = "••••••••" + pwd[-4:] if len(pwd) > 4 else "••••••••"
    return {
        "id": str(o.id), "site_url": o.site_url, "username": o.username,
        "app_password": pwd, "default_category": o.default_category,
        "default_status": o.default_status,
        "updated_at": o.updated_at.isoformat() if o.updated_at else None,
    }


# ── AI helpers ────────────────────────────────────────────────────────────────


def _build_system_prompt(config: RewriteConfig) -> str:
    title_instruction = (
        "The TITLE must be strictly the original one."
        if config.mantieniTitolo
        else "Generate a strong, original TITLE appropriate to the publication's tone."
    )
    base_prompt = (
        config.agentePrompt
        or "You are an expert journalist. Maintain a professional and impartial tone."
    )
    if config.mode == "brief":
        task = (
            f"Your task is to GENERATE FROM SCRATCH a {config.tipoArticolo or 'article'} based on the user's "
            f"brief/prompt. Be creative, persuasive or informative as requested, while always maintaining high "
            f"quality and a genuine journalistic publication style."
        )
    else:
        task = (
            "Your task is to REWRITE the provided news maintaining a professional and impartial tone, "
            "never altering facts or adding personal opinions."
        )
    return (
        f"You are the AI editorial engine for {config.testataNome}.\n\n{base_prompt}\n\n{task}\n\n"
        f"TARGET LENGTH: {config.lunghezza}\nOUTPUT LANGUAGE: {config.lingua}\n\n\n"
        f"FUNDAMENTAL RULES:\n"
        f"- Do not invent facts, data, names or figures not present in the original\n"
        f"- Do not add opinions or editorial comments not present in the original\n"
        f"- Keep all relevant facts from the original article\n"
        f"- Completely rewrite sentence structure — do not copy entire sentences\n\n"
        f"REQUIRED OUTPUT FORMAT (Use exactly these prefixes):\n"
        f"TITLE: {title_instruction}\n"
        f"KICKER: (Generate a brief summary or launch phrase, max 15 words)\n"
        f"BODY:\n(Insert the rewritten article text here, SEO-optimized, formatted in paragraphs)\n"
        f"SEO TAGS: (Generate 4-5 comma-separated tags for SEO optimization)\n"
        f'CITY: (Indicate the reference city if present, otherwise write "National" or "International")\n'
        f"SECTION: (Indicate the editorial section: e.g. Economy, Politics, Crime, International, Sport, Health, Corporate)"
    )


def _extract(raw: str, label: str) -> str:
    m = re.search(rf"{re.escape(label)}:\s*([\s\S]*?)(?=\n[A-ZÀÈÉÌÒÙ ]+:|$)", raw)
    return m.group(1).strip() if m else ""


def _slugify(text: str) -> str:
    slug = re.sub(r"[^a-z0-9\s-]", "", text.lower())
    slug = re.sub(r"\s+", "-", slug)
    return re.sub(r"-+", "-", slug)[:55].rstrip("-")


def _to_html(text: str) -> str:
    paragraphs = [p for p in re.split(r"\n\n+", text) if p]
    return "\n".join(f"<p>{p.replace(chr(10), '<br/>')}</p>" for p in paragraphs)


def _wp_auth(username: str, app_password: str) -> str:
    return "Basic " + base64.b64encode(f"{username}:{app_password}".encode()).decode()


async def _resolve_term_id(base: str, auth: str, endpoint: str, name: str, http: httpx.AsyncClient) -> int | None:
    try:
        r = await http.get(f"{base}/wp-json/wp/v2/{endpoint}", params={"search": name, "per_page": 5},
                           headers={"Authorization": auth}, timeout=15.0)
        if r.is_success:
            for item in r.json():
                if item.get("name", "").lower() == name.lower():
                    return item["id"]
        r2 = await http.post(f"{base}/wp-json/wp/v2/{endpoint}", json={"name": name},
                             headers={"Authorization": auth, "Content-Type": "application/json"}, timeout=15.0)
        if r2.is_success:
            return r2.json().get("id")
    except Exception:
        pass
    return None


async def _is_pdf(url: str, http: httpx.AsyncClient) -> bool:
    if ".pdf" in url.lower().split("?")[0]:
        return True
    try:
        resp = await http.head(url, timeout=3.0, follow_redirects=True)
        ct = resp.headers.get("content-type", "").lower()
        cd = resp.headers.get("content-disposition", "").lower()
        return "application/pdf" in ct or ".pdf" in cd or "pdf" in ct
    except Exception:
        return False


async def _scrape_firecrawl(url: str, key: str, http: httpx.AsyncClient) -> str | None:
    try:
        r = await http.post(
            "https://api.firecrawl.dev/v1/scrape",
            json={"url": url, "formats": ["markdown"], "onlyMainContent": True},
            headers={"Content-Type": "application/json", "Authorization": f"Bearer {key}"},
            timeout=8.0,
        )
        if not r.is_success:
            return None
        data = r.json()
        if not data.get("success") or not data.get("data", {}).get("markdown"):
            return None
        return data["data"]["markdown"][:8000]
    except Exception:
        return None


async def _scrape_html(url: str, http: httpx.AsyncClient) -> str:
    r = await http.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=15.0, follow_redirects=True)
    r.raise_for_status()
    soup = BeautifulSoup(r.text, "html.parser")
    for tag in soup(["script", "style"]):
        tag.decompose()
    return re.sub(r"\s+", " ", soup.get_text(separator=" ")).strip()[:5000]


async def _stream_claude(config: RewriteConfig, api_key: str) -> AsyncGenerator[bytes, None]:
    system_prompt = _build_system_prompt(config)
    user_content = (
        f"Ecco il brief/prompt per l'articolo da generare:\n\n{config.briefText}"
        if config.mode == "brief"
        else f"Ecco l'articolo originale da riscrivere:\n\n{config.articleText}"
    )
    client = anthropic.AsyncAnthropic(api_key=api_key)
    async with client.messages.stream(
        model="claude-haiku-4-5-20251001",
        max_tokens=4096,
        system=system_prompt,
        messages=[{"role": "user", "content": user_content}],
    ) as stream:
        async for text_chunk in stream.text_stream:
            data = json.dumps({"type": "content_block_delta", "delta": {"type": "text_delta", "text": text_chunk}})
            yield f"data: {data}\n\n".encode()


# ── AI proxy routes (JWT protected) ──────────────────────────────────────────


@router.post("/rewrite")
async def rewrite(
    config: RewriteConfig,
    _analyst: WebAnalyst = Depends(get_current_web_analyst),
) -> StreamingResponse:
    settings = get_settings()
    if not settings.anthropic_api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not configured")
    if not config.articleText:
        raise HTTPException(status_code=400, detail="articleText is required")
    return StreamingResponse(
        _stream_claude(config, settings.anthropic_api_key),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )


@router.post("/fetch-article")
async def fetch_article(
    body: FetchArticleRequest,
    _analyst: WebAnalyst = Depends(get_current_web_analyst),
) -> dict:
    settings = get_settings()
    async with httpx.AsyncClient() as http:
        if await _is_pdf(body.url, http):
            raise HTTPException(status_code=422, detail="PDF files cannot be extracted. Please paste the article text directly.")
        if settings.firecrawl_api_key:
            md = await _scrape_firecrawl(body.url, settings.firecrawl_api_key, http)
            if md:
                return {"text": md}
        text = await _scrape_html(body.url, http)
    return {"text": text}


@router.post("/parse-rss")
async def parse_rss(
    body: ParseRssRequest,
    _analyst: WebAnalyst = Depends(get_current_web_analyst),
) -> dict:
    try:
        feed = await asyncio.to_thread(feedparser.parse, body.url)
        items = [
            RssItem(
                title=entry.get("title"),
                link=entry.get("link"),
                pubDate=entry.get("published"),
                contentSnippet=entry.get("summary"),
            ).model_dump()
            for entry in (feed.entries or [])[:10]
        ]
        return {"items": items}
    except Exception:
        return {"items": []}


@router.post("/process-article")
async def process_article(
    body: ProcessArticleRequest,
    analyst: WebAnalyst = Depends(get_current_web_analyst),
) -> dict:
    settings = get_settings()
    if not settings.anthropic_api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not configured")

    article_text = body.snippet or ""
    async with httpx.AsyncClient() as http:
        if not await _is_pdf(body.url, http) and settings.firecrawl_api_key:
            md = await _scrape_firecrawl(body.url, settings.firecrawl_api_key, http)
            if md:
                article_text = md

    if not article_text.strip():
        raise HTTPException(status_code=422, detail="Could not extract article content")

    rewrite_cfg = RewriteConfig(
        articleText=article_text,
        testataNome=body.testataNome or body.sourceName,
        agentePrompt=body.agentePrompt,
        lunghezza=body.lunghezza or "Medium (250-350 words)",
        lingua=body.lingua or "English",
        mantieniTitolo=False,
        mode="rewrite",
    )
    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
    message = await client.messages.create(
        model="claude-haiku-4-5-20251001", max_tokens=2048,
        system=_build_system_prompt(rewrite_cfg),
        messages=[{"role": "user", "content": article_text}],
    )
    raw = next((b.text for b in message.content if b.type == "text"), "")

    generated_title = _extract(raw, "TITLE") or body.originalTitle
    kicker = _extract(raw, "KICKER") or ""
    body_text = _extract(raw, "BODY") or raw
    tags_raw = _extract(raw, "SEO TAGS")
    city = _extract(raw, "CITY") or "National"
    category = _extract(raw, "SECTION") or "News"
    tags = [t.strip() for t in tags_raw.split(",") if t.strip()] if tags_raw else [category, body.sourceName.split()[0], "Notizie"]

    draft = AIDraft(
        id=f"draft-{int(time.time() * 1000)}-{uuid.uuid4().hex[:5]}",
        originalSource=body.sourceName, originalUrl=body.url,
        originalTitle=body.originalTitle, originalExcerpt=body.snippet or article_text[:300],
        originalPublishedAt=datetime.datetime.utcnow().isoformat() + "Z",
        generatedKicker=kicker, generatedTitle=generated_title, generatedSubtitle=kicker,
        generatedBodyPreview=body_text[:200], generatedBody=body_text,
        generatedSeoTitle=f"{generated_title[:52]}... | Redazione",
        generatedMetaDescription=kicker or generated_title,
        generatedSlug=_slugify(generated_title), generatedTags=tags,
        generatedCategory=category, generatedCity=city,
        coverImageUrl="", coverImageStatus="Not selected", coverImageSource="Unsplash",
        coverImageLicense="—", coverImageAttribution="—",
        imageSearchQuery=f"{category} {' '.join(generated_title.split()[:3])}",
        imageAltText=f"Immagine correlata all'articolo su {category}",
        imageCaption="—", alternativeImages=[],
        priorityScore=random.randint(61, 90), priorityReasons=["Authoritative source"],
        status="AI Draft", isBreaking=False,
    )
    return {"draft": draft.model_dump()}


@router.post("/wordpress/test")
async def wordpress_test(
    body: WPTestRequest,
    _analyst: WebAnalyst = Depends(get_current_web_analyst),
) -> dict:
    base = body.siteUrl.rstrip("/")
    auth = _wp_auth(body.username, body.appPassword)
    async with httpx.AsyncClient() as http:
        r = await http.get(f"{base}/wp-json/wp/v2/users/me", headers={"Authorization": auth}, timeout=15.0)
    if not r.is_success:
        try:
            msg = r.json().get("message") or f"WordPress returned {r.status_code}"
        except Exception:
            msg = f"WordPress returned {r.status_code}"
        raise HTTPException(status_code=r.status_code, detail=msg)
    user = r.json()
    return {"success": True, "displayName": user["name"], "wpUsername": user["slug"]}


@router.post("/wordpress/publish")
async def wordpress_publish(
    body: WPPublishRequest,
    _analyst: WebAnalyst = Depends(get_current_web_analyst),
) -> dict:
    base = body.siteUrl.rstrip("/")
    auth = _wp_auth(body.username, body.appPassword)

    async def _no_cat() -> None:
        return None

    async with httpx.AsyncClient(timeout=20.0) as http:
        cat_coro = _resolve_term_id(base, auth, "categories", body.category, http) if body.category else _no_cat()
        tag_coros = [_resolve_term_id(base, auth, "tags", t, http) for t in (body.tags or [])[:10]]
        results = await asyncio.gather(cat_coro, *tag_coros)
        cat_id = results[0]
        tag_ids = [t for t in results[1:] if t is not None]

        post_body: dict = {"title": body.title, "content": _to_html(body.content), "status": body.status}
        if body.excerpt:
            post_body["excerpt"] = body.excerpt
        if body.slug:
            post_body["slug"] = body.slug
        if cat_id is not None:
            post_body["categories"] = [cat_id]
        if tag_ids:
            post_body["tags"] = tag_ids

        r = await http.post(f"{base}/wp-json/wp/v2/posts", json=post_body,
                            headers={"Authorization": auth, "Content-Type": "application/json"})

    if not r.is_success:
        try:
            msg = r.json().get("message") or f"WordPress returned {r.status_code}"
        except Exception:
            msg = f"WordPress returned {r.status_code}"
        raise HTTPException(status_code=r.status_code, detail=msg)

    post = r.json()
    return {"success": True, "postId": post["id"], "postUrl": post["link"],
            "editUrl": f"{base}/wp-admin/post.php?post={post['id']}&action=edit"}


# ── CRUD: Sources ─────────────────────────────────────────────────────────────


@router.get("/sources")
async def list_sources(
    analyst: WebAnalyst = Depends(get_current_web_analyst),
    db: AsyncSession = Depends(get_db),
) -> list:
    q = select(NewsSource).where(NewsSource.created_by_id == analyst.id).order_by(NewsSource.name)
    result = await db.execute(q)
    return [_s(o) for o in result.scalars().all()]


@router.post("/sources", status_code=201)
async def create_source(
    payload: NewsSourceCreate,
    analyst: WebAnalyst = Depends(get_current_web_analyst),
    db: AsyncSession = Depends(get_db),
) -> dict:
    obj = NewsSource(**payload.model_dump(), created_by_id=analyst.id)
    db.add(obj)
    await db.flush()
    await db.refresh(obj)
    return _s(obj)


@router.put("/sources/{source_id}")
async def update_source(
    source_id: uuid.UUID,
    payload: NewsSourceCreate,
    analyst: WebAnalyst = Depends(get_current_web_analyst),
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(select(NewsSource).where(NewsSource.id == source_id, NewsSource.created_by_id == analyst.id))
    obj = result.scalar_one_or_none()
    if obj is None:
        raise HTTPException(status_code=404, detail="Source not found")
    for k, v in payload.model_dump().items():
        setattr(obj, k, v)
    await db.flush()
    return _s(obj)


@router.delete("/sources/{source_id}", status_code=204)
async def delete_source(
    source_id: uuid.UUID,
    analyst: WebAnalyst = Depends(get_current_web_analyst),
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(select(NewsSource).where(NewsSource.id == source_id, NewsSource.created_by_id == analyst.id))
    obj = result.scalar_one_or_none()
    if obj is None:
        raise HTTPException(status_code=404, detail="Source not found")
    await db.delete(obj)
    await db.flush()


# ── CRUD: Agents ──────────────────────────────────────────────────────────────


@router.get("/agents")
async def list_agents(
    analyst: WebAnalyst = Depends(get_current_web_analyst),
    db: AsyncSession = Depends(get_db),
) -> list:
    result = await db.execute(select(NewsAgent).where(NewsAgent.created_by_id == analyst.id).order_by(NewsAgent.name))
    return [_a(o) for o in result.scalars().all()]


@router.post("/agents", status_code=201)
async def create_agent(
    payload: NewsAgentCreate,
    analyst: WebAnalyst = Depends(get_current_web_analyst),
    db: AsyncSession = Depends(get_db),
) -> dict:
    obj = NewsAgent(**payload.model_dump(), created_by_id=analyst.id)
    db.add(obj)
    await db.flush()
    await db.refresh(obj)
    return _a(obj)


@router.put("/agents/{agent_id}")
async def update_agent(
    agent_id: uuid.UUID,
    payload: NewsAgentCreate,
    analyst: WebAnalyst = Depends(get_current_web_analyst),
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(select(NewsAgent).where(NewsAgent.id == agent_id, NewsAgent.created_by_id == analyst.id))
    obj = result.scalar_one_or_none()
    if obj is None:
        raise HTTPException(status_code=404, detail="Agent not found")
    for k, v in payload.model_dump().items():
        setattr(obj, k, v)
    await db.flush()
    return _a(obj)


@router.delete("/agents/{agent_id}", status_code=204)
async def delete_agent(
    agent_id: uuid.UUID,
    analyst: WebAnalyst = Depends(get_current_web_analyst),
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(select(NewsAgent).where(NewsAgent.id == agent_id, NewsAgent.created_by_id == analyst.id))
    obj = result.scalar_one_or_none()
    if obj is None:
        raise HTTPException(status_code=404, detail="Agent not found")
    await db.delete(obj)
    await db.flush()


# ── CRUD: Drafts ──────────────────────────────────────────────────────────────


@router.get("/drafts")
async def list_drafts(
    status: str | None = Query(default=None),
    analyst: WebAnalyst = Depends(get_current_web_analyst),
    db: AsyncSession = Depends(get_db),
) -> list:
    q = select(NewsDraft).where(NewsDraft.created_by_id == analyst.id).order_by(desc(NewsDraft.created_at))
    if status:
        q = q.where(NewsDraft.status == status)
    result = await db.execute(q)
    return [_d(o) for o in result.scalars().all()]


@router.post("/drafts", status_code=201)
async def create_draft(
    payload: NewsDraftCreate,
    analyst: WebAnalyst = Depends(get_current_web_analyst),
    db: AsyncSession = Depends(get_db),
) -> dict:
    obj = NewsDraft(**payload.model_dump(), created_by_id=analyst.id)
    db.add(obj)
    await db.flush()
    await db.refresh(obj)
    return _d(obj)


@router.put("/drafts/{draft_id}")
async def update_draft(
    draft_id: uuid.UUID,
    payload: NewsDraftUpdate,
    analyst: WebAnalyst = Depends(get_current_web_analyst),
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(select(NewsDraft).where(NewsDraft.id == draft_id, NewsDraft.created_by_id == analyst.id))
    obj = result.scalar_one_or_none()
    if obj is None:
        raise HTTPException(status_code=404, detail="Draft not found")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(obj, k, v)
    obj.updated_at = datetime.datetime.now(tz=timezone.utc)
    await db.flush()
    return _d(obj)


@router.delete("/drafts/{draft_id}", status_code=204)
async def delete_draft(
    draft_id: uuid.UUID,
    analyst: WebAnalyst = Depends(get_current_web_analyst),
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(select(NewsDraft).where(NewsDraft.id == draft_id, NewsDraft.created_by_id == analyst.id))
    obj = result.scalar_one_or_none()
    if obj is None:
        raise HTTPException(status_code=404, detail="Draft not found")
    await db.delete(obj)
    await db.flush()


@router.post("/drafts/{draft_id}/approve", status_code=201)
async def approve_draft(
    draft_id: uuid.UUID,
    analyst: WebAnalyst = Depends(get_current_web_analyst),
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(select(NewsDraft).where(NewsDraft.id == draft_id, NewsDraft.created_by_id == analyst.id))
    draft = result.scalar_one_or_none()
    if draft is None:
        raise HTTPException(status_code=404, detail="Draft not found")
    if draft.status == "Published":
        raise HTTPException(status_code=409, detail="Draft is already published")

    draft.status = "Published"
    draft.updated_at = datetime.datetime.now(tz=timezone.utc)
    db.add(draft)

    word_count = len(draft.generated_body.split()) if draft.generated_body else 0
    published = NewsPublished(
        title=draft.generated_title or draft.original_title,
        source_name=draft.original_source,
        published_at=datetime.datetime.now(tz=timezone.utc).isoformat(),
        category=draft.generated_category,
        word_count=word_count,
        original_url=draft.original_url,
        draft_id=draft.id,
        created_by_id=analyst.id,
    )
    db.add(published)
    await db.flush()
    await db.refresh(published)
    return {"draft_id": str(draft.id), "published_id": str(published.id), "status": "Published"}


# ── CRUD: Published ───────────────────────────────────────────────────────────


@router.get("/published")
async def list_published(
    analyst: WebAnalyst = Depends(get_current_web_analyst),
    db: AsyncSession = Depends(get_db),
) -> list:
    result = await db.execute(
        select(NewsPublished)
        .where(NewsPublished.created_by_id == analyst.id)
        .order_by(desc(NewsPublished.created_at))
    )
    return [_p(o) for o in result.scalars().all()]


# ── CRUD: Config — Rules (singleton per user) ─────────────────────────────────


@router.get("/config/rules")
async def get_rules(
    analyst: WebAnalyst = Depends(get_current_web_analyst),
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(select(NewsRules).where(NewsRules.created_by_id == analyst.id).limit(1))
    obj = result.scalar_one_or_none()
    if obj is None:
        obj = NewsRules(created_by_id=analyst.id)
        db.add(obj)
        await db.flush()
        await db.refresh(obj)
    return _r(obj)


@router.put("/config/rules")
async def upsert_rules(
    payload: NewsRulesPayload,
    analyst: WebAnalyst = Depends(get_current_web_analyst),
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(select(NewsRules).where(NewsRules.created_by_id == analyst.id).limit(1))
    obj = result.scalar_one_or_none()
    if obj is None:
        obj = NewsRules(**payload.model_dump(), created_by_id=analyst.id)
    else:
        for k, v in payload.model_dump().items():
            setattr(obj, k, v)
        obj.updated_at = datetime.datetime.now(tz=timezone.utc)
    db.add(obj)
    await db.flush()
    await db.refresh(obj)
    return _r(obj)


# ── CRUD: Config — WordPress (singleton per user) ─────────────────────────────


@router.get("/config/wordpress")
async def get_wp_config(
    analyst: WebAnalyst = Depends(get_current_web_analyst),
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(select(NewsWPConfig).where(NewsWPConfig.created_by_id == analyst.id).limit(1))
    obj = result.scalar_one_or_none()
    if obj is None:
        obj = NewsWPConfig(created_by_id=analyst.id)
        db.add(obj)
        await db.flush()
        await db.refresh(obj)
    return _w(obj, mask=False)


@router.put("/config/wordpress")
async def upsert_wp_config(
    payload: NewsWPConfigPayload,
    analyst: WebAnalyst = Depends(get_current_web_analyst),
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(select(NewsWPConfig).where(NewsWPConfig.created_by_id == analyst.id).limit(1))
    obj = result.scalar_one_or_none()
    if obj is None:
        obj = NewsWPConfig(**payload.model_dump(), created_by_id=analyst.id)
    else:
        for k, v in payload.model_dump().items():
            setattr(obj, k, v)
        obj.updated_at = datetime.datetime.now(tz=timezone.utc)
    db.add(obj)
    await db.flush()
    await db.refresh(obj)
    return _w(obj, mask=False)
