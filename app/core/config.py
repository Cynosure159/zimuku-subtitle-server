import logging
import os
from typing import Any, Optional

from sqlmodel import Session, select

from ..db.models import Setting
from ..db.session import engine

logger = logging.getLogger(__name__)


class ConfigManager:
    """系统配置管理器，支持从数据库动态读取与更新"""

    _DEFAULTS = {
        "base_url": "https://zimuku.org",
        "proxy": "",
        "cache_expiry_hours": "24",
    }

    @classmethod
    def get(cls, key: str, default: Any = None) -> str:
        """获取配置"""
        # 优先从数据库查询
        try:
            with Session(engine) as session:
                statement = select(Setting).where(Setting.key == key)
                setting = session.exec(statement).first()
                if setting:
                    return setting.value
        except Exception as e:
            logger.error(f"从数据库读取配置出错 ({key}): {e}")

        # 其次尝试环境变量 (大写形式)
        env_val = os.getenv(f"ZIMUKU_{key.upper()}")
        if env_val:
            return env_val

        # 最后返回内置默认值或参数默认值
        return default if default is not None else cls._DEFAULTS.get(key, "")

    @classmethod
    def set(cls, key: str, value: str, description: Optional[str] = None):
        """设置配置"""
        with Session(engine) as session:
            statement = select(Setting).where(Setting.key == key)
            setting = session.exec(statement).first()
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


# 预定义的辅助函数
def get_proxy() -> Optional[str]:
    proxy = ConfigManager.get("proxy")
    return proxy if proxy else None


def get_base_url() -> str:
    return ConfigManager.get("base_url")


def get_storage_path() -> str:
    """获取存储根目录的绝对路径"""
    # 默认指向项目根目录下的 storage 文件夹
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    storage_path = os.path.join(base_dir, "storage")
    if not os.path.exists(storage_path):
        os.makedirs(storage_path, exist_ok=True)
    return storage_path
