import os
from contextlib import contextmanager

from sqlmodel import Session, SQLModel, create_engine


def _get_sqlite_url() -> str:
    database_url = os.getenv("ZIMUKU_DATABASE_URL")
    if database_url:
        return database_url

    db_path = os.getenv("ZIMUKU_DB_PATH", "storage/zimuku.db")
    db_dir = os.path.dirname(db_path)
    if db_dir:
        os.makedirs(db_dir, exist_ok=True)
    return f"sqlite:///{db_path}"


sqlite_url = _get_sqlite_url()

# 连接池设置 (对于 SQLite 主要是为了在多线程/多协程下稳定运行)
engine = create_engine(sqlite_url, connect_args={"check_same_thread": False})


def create_db_and_tables():
    """初始化数据库表"""
    SQLModel.metadata.create_all(engine)

    # 初始化默认配置项
    _init_default_settings()


def _init_default_settings():
    """初始化默认配置项到数据库"""
    from sqlmodel import select

    from .models import Setting

    with Session(engine) as session:
        # 检查是否已有配置项
        existing = session.exec(select(Setting)).first()
        if existing:
            return

        # 插入默认配置项
        default_settings = [
            Setting(
                key="base_url",
                value="https://zimuku.org",
                description="字幕网站地址",
            ),
            Setting(
                key="proxy",
                value="",
                description="HTTP 代理地址（如需代理访问字幕网站）",
            ),
            Setting(
                key="cache_expiry_hours",
                value="24",
                description="搜索缓存有效期（小时）",
            ),
        ]
        for setting in default_settings:
            session.add(setting)
        session.commit()


def get_session():
    """FastAPI 依赖项：获取数据库会话"""
    with Session(engine) as session:
        yield session


@contextmanager
def session_scope():
    """为后台任务提供独立、短生命周期的数据库会话。"""
    with Session(engine) as session:
        yield session
