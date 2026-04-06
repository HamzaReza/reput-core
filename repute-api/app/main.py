from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import engine, Base
from app.routers import auth, users, reputation, quotes

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Auto-create tables on startup (use Alembic for production migrations)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS: in debug, also allow any localhost / 127.0.0.1 / ::1 port (Next.js dev, alternate ports)
_cors_kw: dict = {
    "allow_origins": settings.allowed_origins,
    "allow_credentials": True,
    "allow_methods": ["*"],
    "allow_headers": ["*"],
}
if settings.debug:
    _cors_kw["allow_origin_regex"] = (
        r"https?://(localhost|127\.0\.0\.1|\[::1\])(:\d+)?"
    )
app.add_middleware(CORSMiddleware, **_cors_kw)

API_PREFIX = "/api/v1"
app.include_router(auth.router, prefix=API_PREFIX)
app.include_router(users.router, prefix=API_PREFIX)
app.include_router(reputation.router, prefix=API_PREFIX)
app.include_router(quotes.router, prefix=API_PREFIX)


@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok", "version": settings.app_version}
