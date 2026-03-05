from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class Setting(SQLModel, table=True):
    """系统配置表"""

    id: Optional[int] = Field(default=None, primary_key=True)
    key: str = Field(index=True, unique=True)
    value: str
    description: Optional[str] = None
    updated_at: datetime = Field(default_factory=datetime.now)


class SearchCache(SQLModel, table=True):
    """搜索结果缓存表"""

    id: Optional[int] = Field(default=None, primary_key=True)
    query: str = Field(index=True, unique=True)
    # 存储 SubtitleResult 列表的 JSON 字符串
    results_json: str = Field(default="[]")
    created_at: datetime = Field(default_factory=datetime.now)
    expires_at: datetime


class SubtitleTask(SQLModel, table=True):
    """字幕下载/处理任务表"""

    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    source_url: str
    status: str = Field(default="pending")  # pending, downloading, completed, failed
    filename: Optional[str] = None
    save_path: Optional[str] = None
    error_msg: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)


class MediaPath(SQLModel, table=True):
    """媒体库扫描路径表"""

    id: Optional[int] = Field(default=None, primary_key=True)
    path: str = Field(index=True, unique=True)
    type: str = Field(default="movie")  # movie, tv
    enabled: bool = Field(default=True)
    last_scanned_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.now)
