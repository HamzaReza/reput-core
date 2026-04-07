import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import engine, Base
from app.routers import auth, users, reputation, quotes

settings = get_settings()
logger = logging.getLogger(__name__)

# Wait for Postgres (Docker / Railway) — avoids crash when API starts before DB is listening
_DB_STARTUP_RETRIES = 30
_DB_STARTUP_DELAY_SEC = 2.0


def _is_db_unreachable(exc: BaseException) -> bool:
    chain: list[BaseException] = []
    cur: BaseException | None = exc
    while cur is not None:
        chain.append(cur)
        cur = cur.__cause__
    for e in chain:
        if isinstance(e, (ConnectionRefusedError, TimeoutError)):
            return True
        if isinstance(e, OSError) and getattr(e, "errno", None) in (111, 61):
            return True
    msg = str(exc).lower()
    return "connection refused" in msg or "could not connect" in msg


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Auto-create tables on startup (use Alembic for production migrations)
    for attempt in range(1, _DB_STARTUP_RETRIES + 1):
        try:
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            break
        except Exception as e:
            if attempt < _DB_STARTUP_RETRIES and _is_db_unreachable(e):
                logger.warning(
                    "Database not reachable yet (%s/%s): %s — retrying in %ss",
                    attempt,
                    _DB_STARTUP_RETRIES,
                    e,
                    _DB_STARTUP_DELAY_SEC,
                )
                await asyncio.sleep(_DB_STARTUP_DELAY_SEC)
                continue
            logger.exception("Database initialization failed (app will not start)")
            raise
    yield
    await engine.dispose()


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS: JSON requests trigger a preflight (OPTIONS); form login often does not — origins must match.
_cors_kw: dict = {
    "allow_origins": settings.allowed_origins,
    "allow_credentials": True,
    "allow_methods": ["*"],
    "allow_headers": ["*"],
}
_cors_regex_parts: list[str] = []
if settings.debug:
    _cors_regex_parts.append(r"https?://(localhost|127\.0\.0\.1|\[::1\])(:\d+)?")
if settings.cors_allow_vercel_previews:
    _cors_regex_parts.append(r"https://[a-zA-Z0-9-]+\.vercel\.app")
if _cors_regex_parts:
    _cors_kw["allow_origin_regex"] = (
        "|".join(f"({p})" for p in _cors_regex_parts)
        if len(_cors_regex_parts) > 1
        else _cors_regex_parts[0]
    )
app.add_middleware(CORSMiddleware, **_cors_kw)


@app.get("/", tags=["health"])
async def root():
    """So opening the service URL in a browser returns 200 instead of 404 when the app is up."""
    return {"status": "ok", "service": settings.app_name}


API_PREFIX = "/api/v1"
app.include_router(auth.router, prefix=API_PREFIX)
app.include_router(users.router, prefix=API_PREFIX)
app.include_router(reputation.router, prefix=API_PREFIX)
app.include_router(quotes.router, prefix=API_PREFIX)


@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok", "version": settings.app_version}
