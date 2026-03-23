from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from app.db.session import create_db_and_tables
from app.main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_db():
    create_db_and_tables()


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_settings_api():
    # 测试更新配置
    response = client.post("/settings/", json={"key": "test_api_key", "value": "test_api_val"})
    assert response.status_code == 200
    data = response.json()
    assert data["key"] == "test_api_key"
    assert data["value"] == "test_api_val"

    # 测试读取配置
    response = client.get("/settings/")
    assert response.status_code == 200
    settings = response.json()
    assert any(s["key"] == "test_api_key" for s in settings)


def test_search_api_basic():
    # 模拟搜索（不测试真实的爬虫，除非有 mock）
    # 但我们可以测试带查询参数的请求是否能到达逻辑
    # 此时如果没有网络或 zimuku 挂了，可能会返回 500，这是预期的
    response = client.get("/search/?q=avatar")
    # 如果搜索成功或触发验证码并处理，可能返回 200
    # 如果环境没有网络或 OCR 失败，可能返回 502
    assert response.status_code in [200, 502]


@pytest.mark.anyio
async def test_search_api_maps_upstream_failure_to_502():
    with patch("app.services.search_service.ZimukuAgent") as mock_agent:
        instance = mock_agent.return_value
        instance.search = AsyncMock(side_effect=RuntimeError("upstream boom"))
        instance.close = AsyncMock(return_value=None)

        response = client.get("/search/", params={"q": "avatar"})

    assert response.status_code == 502
    assert response.json()["detail"] == "Search failed"
