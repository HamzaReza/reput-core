"""Bootstrap the database before starting the API.

The Alembic migration chain predates the base schema: revision 0001 starts
with ALTER TABLE on `users`, so `alembic upgrade head` crashes on an empty
database. The base tables have always been created by
`Base.metadata.create_all()` at app startup instead.

This script resolves that chicken-and-egg for fresh databases:

- Fresh database (no `users` table): create the full current schema via
  `Base.metadata.create_all()` and stamp Alembic at head - `create_all`
  already builds what the migrations would have produced.
- Existing database: run `alembic upgrade head` as before.
"""
import asyncio

from sqlalchemy import inspect

from alembic import command
from alembic.config import Config

from app.database import Base, engine

# Import every model module so Base.metadata holds the full schema
import app.models.user  # noqa: F401
import app.models.reputation  # noqa: F401
import app.models.quote  # noqa: F401
import app.models.contract  # noqa: F401
import app.models.meeting  # noqa: F401
import app.models.lead  # noqa: F401
import app.models.client  # noqa: F401
import app.models.feedback  # noqa: F401


def _users_table_exists(sync_conn) -> bool:
    return inspect(sync_conn).has_table("users")


async def _bootstrap_if_fresh() -> bool:
    """Create the schema on a fresh database. Returns True if it was fresh."""
    async with engine.begin() as conn:
        fresh = not await conn.run_sync(_users_table_exists)
        if fresh:
            await conn.run_sync(Base.metadata.create_all)
    await engine.dispose()
    return fresh


def main() -> None:
    cfg = Config("alembic.ini")
    if asyncio.run(_bootstrap_if_fresh()):
        print("prestart: fresh database - created schema, stamping alembic head")
        command.stamp(cfg, "head")
    else:
        print("prestart: existing database - running alembic upgrade head")
        command.upgrade(cfg, "head")


if __name__ == "__main__":
    main()
