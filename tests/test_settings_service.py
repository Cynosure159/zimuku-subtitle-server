import os
from unittest.mock import patch

import pytest
from sqlmodel import Session, SQLModel, create_engine, select

from app.db.models import Setting
from app.services.settings_service import SettingsService

# 使用内存数据库进行测试
sqlite_url = "sqlite://"
test_engine = create_engine(sqlite_url, connect_args={"check_same_thread": False})


@pytest.fixture(name="session")
def session_fixture():
    SQLModel.metadata.create_all(test_engine)
    with Session(test_engine) as session:
        yield session
    SQLModel.metadata.drop_all(test_engine)


@pytest.fixture(name="mock_engine")
def mock_engine_fixture(session):
    """Patch the config/session scope to use the test engine."""
    with patch("app.db.session.engine", test_engine):
        yield session


def test_get_setting_nonexistent(mock_engine):
    """Test getting a non-existent key returns None"""
    result = SettingsService.get_setting("nonexistent_key")
    assert result is None


def test_set_setting_new(mock_engine):
    """Test creating a new setting"""
    setting = SettingsService.set_setting("theme", "dark", description="App theme")

    assert setting.key == "theme"
    assert setting.value == "dark"
    assert setting.description == "App theme"

    # Verify it's in the database
    db_setting = mock_engine.exec(select(Setting).where(Setting.key == "theme")).first()
    assert db_setting is not None
    assert db_setting.value == "dark"


def test_set_setting_update(mock_engine):
    """Test updating an existing setting"""
    # First create a setting
    SettingsService.set_setting("language", "en")

    # Update it
    updated = SettingsService.set_setting("language", "zh-CN", description="Language setting")

    assert updated.value == "zh-CN"
    assert updated.description == "Language setting"

    # Verify it's updated in the database
    db_setting = mock_engine.exec(select(Setting).where(Setting.key == "language")).first()
    assert db_setting.value == "zh-CN"


def test_get_all_settings(mock_engine):
    """Test getting all settings as dict"""
    # Create some settings
    SettingsService.set_setting("key1", "value1")
    SettingsService.set_setting("key2", "value2")
    SettingsService.set_setting("key3", "value3")

    # Get all settings
    all_settings = SettingsService.get_all_settings_map()

    assert isinstance(all_settings, dict)
    assert len(all_settings) == 3
    assert all_settings["key1"] == "value1"
    assert all_settings["key2"] == "value2"
    assert all_settings["key3"] == "value3"


def test_get_all_settings_empty(mock_engine):
    """Test getting all settings when none exist"""
    all_settings = SettingsService.get_all_settings_map()
    assert all_settings == {}


def test_get_setting_existing(mock_engine):
    """Test getting an existing setting"""
    SettingsService.set_setting("test_key", "test_value")

    result = SettingsService.get_setting("test_key")

    assert result == "test_value"


def test_set_setting_without_description(mock_engine):
    """Test creating a setting without description"""
    setting = SettingsService.set_setting("simple_key", "simple_value")

    assert setting.key == "simple_key"
    assert setting.value == "simple_value"
    assert setting.description is None


def test_set_path_setting_normalizes_to_absolute_path(mock_engine, tmp_path):
    setting = SettingsService.set_setting("download_path", str(tmp_path / ".." / "downloads"))
    assert setting.value == os.path.abspath(str(tmp_path / ".." / "downloads"))


def test_set_numeric_setting_rejects_invalid_value(mock_engine):
    with pytest.raises(ValueError, match="cache_expiry_hours"):
        SettingsService.set_setting("cache_expiry_hours", "0")
