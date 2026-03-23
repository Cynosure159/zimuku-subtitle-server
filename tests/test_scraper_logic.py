from unittest.mock import AsyncMock, Mock, patch

import pytest

from app.core.scraper import SubtitleResult, ZimukuAgent


@pytest.mark.anyio
async def test_parse_search_results_logic():
    """测试搜索结果页解析逻辑（兜底第3层：直接返回所有 <tr> 结果）"""
    # 模拟符合 Zimuku 搜索结果页结构的 HTML
    mock_html = """
    <html>
        <body>
            <table>
                <tr class="odd">
                    <td class="first"><a href="/detail/123.html" title="Avengers">Avengers</a></td>
                    <td class="tac lang">
                        <img src="/img/cn.png" title="简体字幕" />
                        <img src="/img/en.png" title="英语字幕" />
                    </td>
                </tr>
                <tr class="even">
                    <td class="first"><a href="/detail/456.html" title="Avatar">Avatar</a></td>
                    <td class="tac lang">
                        <img src="/img/tw.png" title="繁体字幕" />
                    </td>
                </tr>
            </table>
        </body>
    </html>
    """

    mock_response = Mock()
    mock_response.status_code = 200
    mock_response.text = mock_html
    mock_response.headers = {}

    agent = ZimukuAgent()
    with patch.object(agent.client, "get", new=AsyncMock(return_value=mock_response)):
        # 不传 season/episode，走第 3 层兜底策略
        results = await agent.search("test")

    assert len(results) == 2
    assert results[0].title == "Avengers"
    assert "简体" in results[0].lang
    assert "英语" in results[0].lang
    assert results[1].title == "Avatar"
    assert "繁体" in results[1].lang

    await agent.close()


@pytest.mark.anyio
async def test_search_with_episode_match():
    """测试第1层匹配：搜索结果中直接按 S01E02 关键字匹配"""
    mock_html = """
    <html>
        <body>
            <table>
                <tr>
                    <td><a href="/detail/100.html">Young Sheldon S04E17 字幕</a></td>
                    <td class="tac lang">
                        <img title="简体中文字幕" />
                    </td>
                </tr>
                <tr>
                    <td><a href="/detail/101.html">Young Sheldon S04E16 字幕</a></td>
                    <td class="tac lang">
                        <img title="英语字幕" />
                    </td>
                </tr>
                <tr>
                    <td><a href="/detail/102.html">小谢尔顿 第4季全集 字幕包</a></td>
                    <td class="tac lang">
                        <img title="双语字幕" />
                    </td>
                </tr>
            </table>
        </body>
    </html>
    """

    mock_response = Mock()
    mock_response.status_code = 200
    mock_response.text = mock_html
    mock_response.headers = {}

    agent = ZimukuAgent()
    with patch.object(agent.client, "get", new=AsyncMock(return_value=mock_response)):
        # 第一层精确匹配已弃用，由于 Mock 数据里没有季分类 div，代码将进入第三层（兜底）
        results = await agent.search("小谢尔顿", season=4, episode=17)

    # 在第三层兜底匹配中，二次过滤因为存在精确集的字幕文件，应该只过滤出1条结果
    assert len(results) == 1
    assert "S04E17" in results[0].title

    await agent.close()


@pytest.mark.anyio
async def test_double_filter():
    """测试二次过滤逻辑"""
    agent = ZimukuAgent()

    results = [
        SubtitleResult("Show S01E03 字幕", "/detail/1", ["中文"], "5"),
        SubtitleResult("Show S01E02 字幕", "/detail/2", ["中文"], "5"),
        SubtitleResult("Show 全集字幕包", "/detail/3", ["中文"], "5"),
    ]

    # 二次过滤应保留含 S01E03 的
    filtered = agent._double_filter(results, season=1, episode=3)
    assert len(filtered) == 1
    assert "E03" in filtered[0].title.upper()

    # 如果过滤后为空，应返回原列表
    filtered = agent._double_filter(results, season=1, episode=99)
    assert len(filtered) == 3

    # season 为 None 时仅按集号过滤
    filtered = agent._double_filter(results, season=None, episode=2)
    assert len(filtered) == 1
    assert "E02" in filtered[0].title.upper()

    # season/episode 为 None 时不做过滤
    filtered = agent._double_filter(results, season=None, episode=None)
    assert len(filtered) == 3

    await agent.close()


def test_ocr_pixel_logic():
    from app.core.ocr import SimpleOCREngine

    ocr = SimpleOCREngine()
    assert ocr is not None
    # 测试空输入
    assert ocr.recognize("") == ""
