import logging
from typing import List, Optional

import mcp.types as types
from mcp.server import Server
from mcp.server.stdio import stdio_server
from sqlmodel import Session, select

from ..core.scraper import ZimukuAgent
from ..db.models import SearchCache, SubtitleTask
from ..db.session import engine
from ..api.download import run_download_task

logger = logging.getLogger(__name__)

# 创建 MCP 服务器实例
server = Server("zimuku-subtitle-server")

@server.list_tools()
async def handle_list_tools() -> List[types.Tool]:
    """列出可用的工具"""
    return [
        types.Tool(
            name="search_subtitles",
            description="在字幕库中搜索字幕",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "搜索关键词（如电影或剧集名称）"},
                },
                "required": ["query"],
            },
        ),
        types.Tool(
            name="download_subtitle",
            description="根据搜索结果的详情链接下载字幕",
            inputSchema={
                "type": "object",
                "properties": {
                    "title": {"type": "string", "description": "字幕标题"},
                    "source_url": {"type": "string", "description": "详情页 URL"},
                },
                "required": ["title", "source_url"],
            },
        ),
    ]

@server.call_tool()
async def handle_call_tool(
    name: str, arguments: dict | None
) -> List[types.TextContent | types.ImageContent | types.EmbeddedResource]:
    """处理工具调用"""
    if name == "search_subtitles":
        query = arguments.get("query")
        if not query:
            return [types.TextContent(type="text", text="Error: Missing query")]
        
        agent = ZimukuAgent()
        try:
            results = await agent.search(query)
            if not results:
                return [types.TextContent(type="text", text=f"未找到关于 '{query}' 的字幕")]
            
            text = f"找到 {len(results)} 个结果:\n"
            for r in results:
                text += f"- [{'/'.join(r.lang)}] {r.title}\n  URL: {r.link}\n"
            
            return [types.TextContent(type="text", text=text)]
        except Exception as e:
            return [types.TextContent(type="text", text=f"搜索出错: {str(e)}")]
        finally:
            await agent.close()

    elif name == "download_subtitle":
        title = arguments.get("title")
        source_url = arguments.get("source_url")
        if not title or not source_url:
            return [types.TextContent(type="text", text="Error: Missing title or source_url")]

        with Session(engine) as session:
            task = SubtitleTask(title=title, source_url=source_url)
            session.add(task)
            session.commit()
            session.refresh(task)
            task_id = task.id
            
            # 在 MCP 这种同步/流式调用中，我们可以选择等待完成或仅返回 ID
            # 为了更好的体验，我们触发下载
            await run_download_task(task_id, session)
            
            # 重新获取状态
            session.refresh(task)
            if task.status == "completed":
                return [types.TextContent(type="text", text=f"字幕下载并处理成功！保存路径: {task.save_path}")]
            else:
                return [types.TextContent(type="text", text=f"下载任务已创建 (ID: {task_id})，当前状态: {task.status}. {task.error_msg or ''}")]

    else:
        raise ValueError(f"Unknown tool: {name}")

async def run():
    """以 stdio 模式运行 MCP 服务器"""
    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            server.create_initialization_options()
        )
