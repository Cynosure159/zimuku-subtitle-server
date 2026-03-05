import os

from sqlmodel import Session, SQLModel, create_engine

# 确保存储目录存在
os.makedirs("storage", exist_ok=True)
DB_PATH = "storage/zimuku.db"
sqlite_url = f"sqlite:///{DB_PATH}"

# 连接池设置 (对于 SQLite 主要是为了在多线程/多协程下稳定运行)
engine = create_engine(sqlite_url, connect_args={"check_same_thread": False})


def create_db_and_tables():
    """初始化数据库表"""
    SQLModel.metadata.create_all(engine)


def get_session():
    """FastAPI 依赖项：获取数据库会话"""
    with Session(engine) as session:
        yield session
