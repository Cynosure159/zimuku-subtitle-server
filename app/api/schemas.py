from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field


class StatusResponse(BaseModel):
    status: str = "ok"


class TaskTriggerResponse(StatusResponse):
    message: str
    task_kind: str
    target: Optional[str] = None


class ActionResponse(StatusResponse):
    message: str
    cleared_count: Optional[int] = None


class TaskListResponse(BaseModel):
    total: int
    offset: int
    limit: int
    items: list[Any]


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


class SettingUpdateRequest(BaseModel):
    key: str
    value: str
    description: Optional[str] = None


class MediaMetadataResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    file_id: int
    filename: str
    nfo_data: Optional[dict[str, Any]] = None
    poster_path: Optional[str] = None
    fanart_path: Optional[str] = None
    txt_info: Optional[dict[str, Any]] = None
