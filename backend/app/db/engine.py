"""
Async SQLAlchemy engine connecting to Supabase Postgres via asyncpg.
"""

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import get_settings

_engine = None
_session_factory = None


def get_engine():
    """Lazy-create the async engine from SUPABASE_DB_URL."""
    global _engine
    if _engine is None:
        settings = get_settings()
        if not settings.supabase_db_url:
            raise RuntimeError(
                "SUPABASE_DB_URL is not set. "
                "Get it from Supabase Dashboard > Settings > Database > Connection string (Transaction pooler)."
            )
        _engine = create_async_engine(
            settings.supabase_db_url,
            pool_size=5,
            max_overflow=10,
            pool_pre_ping=True,
            connect_args={
                "statement_cache_size": 0,
                "prepared_statement_cache_size": 0,
            },
            echo=settings.debug,
        )
    return _engine


def get_session_factory() -> async_sessionmaker[AsyncSession] | None:
    """Lazy-create the session factory, or return None if not configured."""
    global _session_factory
    if _session_factory is None:
        try:
            eng = get_engine()
            _session_factory = async_sessionmaker(
                eng,
                class_=AsyncSession,
                expire_on_commit=False,
            )
        except RuntimeError:
            return None
    return _session_factory


async def get_db():
    """FastAPI dependency — yields an async session or None if DB not configured."""
    factory = get_session_factory()
    if factory is None:
        yield None
        return
    async with factory() as session:
        yield session


async def dispose_engine():
    """Call on shutdown to cleanly close all connections."""
    global _engine, _session_factory
    if _engine is not None:
        await _engine.dispose()
        _engine = None
        _session_factory = None
