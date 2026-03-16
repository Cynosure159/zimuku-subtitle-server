from typing import Any, Optional

from sqlmodel import Session

from ..core.config import ConfigManager
from ..db.models import Setting
from ..db.session import engine


class SettingsService:
    """Service layer for settings management, encapsulating Core ConfigManager"""

    @staticmethod
    def get_setting(key: str) -> Optional[str]:
        """Get a setting value by key"""
        from sqlmodel import select

        with Session(engine) as session:
            setting = session.exec(select(Setting).where(Setting.key == key)).first()
            return setting.value if setting else None

    @staticmethod
    def set_setting(key: str, value: str, description: Optional[str] = None) -> Setting:
        """Set a setting value"""
        from sqlmodel import select

        with Session(engine) as session:
            setting = session.exec(select(Setting).where(Setting.key == key)).first()
            if setting:
                setting.value = value
                if description:
                    setting.description = description
            else:
                setting = Setting(key=key, value=value, description=description)
                session.add(setting)
            session.commit()
            session.refresh(setting)
            return setting

    @staticmethod
    def get_all_settings() -> dict[str, str]:
        """Get all settings as dict"""
        with Session(engine) as session:
            settings = session.query(Setting).all()
            return {s.key: s.value for s in settings}

    # Add methods that wrap ConfigManager if needed
    @staticmethod
    def get_config_manager() -> ConfigManager:
        """Get ConfigManager instance for advanced usage"""
        return ConfigManager()

    @staticmethod
    def get_config(key: str, default: Any = None) -> str:
        """Get configuration value using ConfigManager (supports DB, env, defaults)"""
        return ConfigManager.get(key, default)
