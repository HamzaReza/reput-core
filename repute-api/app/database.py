from sqlalchemy.engine.url import make_url
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

from app.config import get_settings

settings = get_settings()


def _asyncpg_connect_args(database_url: str) -> dict:
    """Railway / managed Postgres require TLS; missing ssl can make connections hang → edge 502."""
    raw = database_url
    if raw.startswith("postgresql+asyncpg://"):
        raw = "postgresql://" + raw.split("postgresql+asyncpg://", 1)[1]
    elif raw.startswith("postgres://"):
        raw = "postgresql://" + raw.split("postgres://", 1)[1]
    try:
        u = make_url(raw)
        host = (u.host or "").lower()
    except Exception:
        host = ""

    # Docker / local dev service names — no TLS to plain Postgres
    local_hosts = frozenset({"localhost", "127.0.0.1", "::1", "postgres", "db"})
    args: dict = {"timeout": 15, "command_timeout": 120}

    lower = database_url.lower()
    if "sslmode=disable" in lower:
        return args

    # Public managed Postgres (Railway public URL, Neon, etc.) needs TLS.
    # Railway *private* DB hostnames (*.railway.internal) often must not use ssl=True here.
    use_ssl = (
        host
        and host not in local_hosts
        and not host.endswith(".internal")
        and not host.endswith(".local")
    )
    if use_ssl:
        args["ssl"] = True
    return args


engine = create_async_engine(
    settings.async_database_url,
    echo=settings.debug,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    connect_args=_asyncpg_connect_args(settings.async_database_url),
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:  # type: ignore[return]
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
