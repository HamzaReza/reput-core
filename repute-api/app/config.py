import json
from functools import lru_cache
from typing import Any

from pydantic import Field, PrivateAttr, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def _split_allowed_origins(raw: str) -> list[str]:
    """Comma-separated URLs, or a JSON array string. Empty → localhost defaults."""
    if raw is None:
        return ["http://localhost:3000", "http://127.0.0.1:3000"]
    s = str(raw).strip()
    if not s:
        return ["http://localhost:3000", "http://127.0.0.1:3000"]
    if s.startswith("["):
        try:
            parsed = json.loads(s)
            if isinstance(parsed, list):
                return [str(x).strip() for x in parsed if str(x).strip()]
        except json.JSONDecodeError:
            pass
    return [x.strip() for x in s.split(",") if x.strip()]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # App
    app_name: str = "RepuTrust API"
    app_version: str = "1.0.0"
    debug: bool = False
    #: Maps env ALLOWED_ORIGINS. Must be str — list[str] would make pydantic-settings call json.loads on the value (breaks on "" or comma-separated text).
    allowed_origins_raw: str = Field(
        default="http://localhost:3000,http://127.0.0.1:3000",
        validation_alias="ALLOWED_ORIGINS",
    )
    #: When True, allow any https://*.vercel.app origin (preview deploys). Use on staging only.
    cors_allow_vercel_previews: bool = True

    _allowed_origins: list[str] = PrivateAttr(
        default_factory=lambda: ["http://localhost:3000", "http://127.0.0.1:3000"]
    )

    @field_validator("allowed_origins_raw", mode="before")
    @classmethod
    def empty_allowed_origins_raw(cls, v: Any) -> Any:
        if v is None or (isinstance(v, str) and not v.strip()):
            return "http://localhost:3000,http://127.0.0.1:3000"
        return v

    @model_validator(mode="after")
    def build_allowed_origins(self) -> "Settings":
        self._allowed_origins = _split_allowed_origins(self.allowed_origins_raw)
        return self

    @property
    def allowed_origins(self) -> list[str]:
        return self._allowed_origins

    # Database — Railway provides postgresql:// so we normalise it to asyncpg
    database_url: str = "postgresql+asyncpg://reput_user:reput_pass@localhost:5432/reput_db"

    # JWT
    jwt_secret: str = "change-me-in-production-use-a-long-random-string"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24  # 24 hours

    @property
    def async_database_url(self) -> str:
        """Always returns a postgresql+asyncpg:// URL regardless of what was provided."""
        url = self.database_url
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+asyncpg://", 1)
        elif url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url


@lru_cache
def get_settings() -> Settings:
    return Settings()
