import pytest
from app.mcp.server import handle_list_tools, handle_call_tool
import mcp.types as types

@pytest.mark.asyncio
async def test_mcp_list_tools():
    """验证工具注册情况"""
    tools = await handle_list_tools()
    tool_names = [t.name for t in tools]
    
    assert "search_subtitles" in tool_names
    assert "download_subtitle" in tool_names
    
    # 验证 search_subtitles 的 schema
    search_tool = next(t for t in tools if t.name == "search_subtitles")
    assert "query" in search_tool.inputSchema["properties"]

@pytest.mark.asyncio
async def test_mcp_call_search_tool(mocker):
    """验证 MCP 调用搜索逻辑"""
    # Mock ZimukuAgent
    mock_agent = mocker.patch("app.mcp.server.ZimukuAgent", autospec=True)
    instance = mock_agent.return_value
    
    # 准备假结果
    from app.core.scraper import SubtitleResult
    instance.search.return_value = [
        SubtitleResult(title="Test", link="http://test", lang=["中文"], rating="10")
    ]
    instance.close.return_value = None

    # 调用
    results = await handle_call_tool("search_subtitles", {"query": "Avengers"})
    
    assert len(results) == 1
    assert "找到 1 个结果" in results[0].text
    assert "Test" in results[0].text

@pytest.mark.asyncio
async def test_mcp_call_download_tool(mocker):
    """验证 MCP 调用下载逻辑"""
    # Mock run_download_task，避免真实下载
    mocker.patch("app.mcp.server.run_download_task", autospec=True)
    
    arguments = {
        "title": "Avengers",
        "source_url": "http://zimuku.org/detail/123"
    }
    
    # 由于下载逻辑是后台运行的，在 handle_call_tool 里被 await
    # 即使 mock 了，我们也应该能得到一个成功的响应
    results = await handle_call_tool("download_subtitle", arguments)
    
    assert len(results) == 1
    # 因为我们在 mock 后的任务中状态是 pending (默认状态)
    assert "下载任务已创建" in results[0].text
