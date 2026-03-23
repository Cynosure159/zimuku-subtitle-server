from unittest.mock import AsyncMock, patch

import pytest

from app.db.session import create_db_and_tables
from app.mcp.server import handle_call_tool, handle_list_tools


@pytest.fixture(autouse=True)
def setup_db():
    create_db_and_tables()


@pytest.mark.anyio
async def test_mcp_list_tools():
    """验证工具注册情况"""
    tools = await handle_list_tools()
    tool_names = [t.name for t in tools]

    assert "search_subtitles" in tool_names
    assert "download_subtitle" in tool_names

    # 验证 search_subtitles 的 schema
    search_tool = next(t for t in tools if t.name == "search_subtitles")
    assert "query" in search_tool.inputSchema["properties"]


@pytest.mark.anyio
async def test_mcp_call_search_tool():
    """验证 MCP 调用搜索逻辑"""
    with patch(
        "app.mcp.server.SearchService.search",
        new=AsyncMock(return_value=[{"title": "Test", "link": "http://test", "lang": ["中文"], "rating": "10"}]),
    ):
        results = await handle_call_tool("search_subtitles", {"query": "Avengers"})

    assert len(results) == 1
    assert "找到 1 个结果" in results[0].text
    assert "Test" in results[0].text


@pytest.mark.anyio
async def test_mcp_call_download_tool():
    """验证 MCP 调用下载逻辑"""
    with patch("app.mcp.server.TaskService.run_download_task", new=AsyncMock(return_value=None)):
        arguments = {"title": "Avengers", "source_url": "http://zimuku.org/detail/123"}
        results = await handle_call_tool("download_subtitle", arguments)

    assert len(results) == 1
    # 因为我们在 mock 后的任务中状态是 pending (默认状态)
    assert "下载任务已创建" in results[0].text
