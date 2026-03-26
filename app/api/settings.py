from fastapi import APIRouter

from ..db.models import Setting
from ..services.settings_service import SettingsService
from .errors import raise_for_service_error
from .schemas import SettingUpdateRequest

router = APIRouter(prefix="/settings", tags=["Settings"])


@router.get("/", response_model=list[Setting])
async def list_settings():
    """获取所有配置"""
    return SettingsService.get_all_settings()


@router.post("/", response_model=Setting)
async def update_setting(update: SettingUpdateRequest):
    """更新或创建配置"""
    try:
        return SettingsService.set_setting(update.key, update.value, update.description)
    except Exception as exc:
        raise_for_service_error(exc)
