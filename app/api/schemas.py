from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field


class TaskTriggerResponse(BaseModel):
    status: str = "ok"
    message: str
    task_kind: str
    target: Optional[str] = None


class ActionResponse(BaseModel):
    status: str = "ok"
    message: str
    cleared_count: Optional[int] = None


class TaskCreateRequest(BaseModel):
    title: str = Field(min_length=1)
    source_url: str = Field(min_length=1)
    target_path: Optional[str] = None
    target_type: Optional[str] = None
    season: Optional[int] = None
    episode: Optional[int] = None
    language: Optional[str] = None


class SeasonMatchRequest(BaseModel):
    title: str = Field(min_length=1)
    season: int = Field(ge=1)


class MediaMetadataResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    file_id: int
    filename: str
    nfo_data: Optional[dict[str, Any]] = None
    poster_path: Optional[str] = None
    fanart_path: Optional[str] = None
    txt_info: Optional[dict[str, Any]] = None
