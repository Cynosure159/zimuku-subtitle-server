from typing import Any, Optional

from ..core.config import ConfigManager
from ..db.models import Setting


class SettingsService:
    """设置服务，统一委托给 ConfigManager。"""

    @staticmethod
    def get_setting(key: str) -> Optional[str]:
        """Get a setting value by key"""
        value = ConfigManager.get(key)
        return value if value != "" else None

    @staticmethod
    def set_setting(key: str, value: str, description: Optional[str] = None) -> Setting:
        """Set a setting value"""
        return ConfigManager.set(key, value, description)

    @staticmethod
    def get_all_settings() -> list[Setting]:
        """Get all settings"""
        return ConfigManager.list_settings()

    @staticmethod
    def get_all_settings_map() -> dict[str, str]:
        return {setting.key: setting.value for setting in ConfigManager.list_settings()}

    @staticmethod
    def get_config_manager() -> ConfigManager:
        """Get ConfigManager instance for advanced usage"""
        return ConfigManager()

    @staticmethod
    def get_config(key: str, default: Any = None) -> str:
        """Get configuration value using ConfigManager (supports DB, env, defaults)"""
        return ConfigManager.get(key, default)
