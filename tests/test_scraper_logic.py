import pytest

from app.core.scraper import ZimukuAgent


@pytest.mark.asyncio
async def test_parse_search_results_logic(mocker):
    # 模拟符合 Zimuku 结构的 HTML
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

    # Mock httpx.AsyncClient.get
    mock_response = mocker.Mock()
    mock_response.status_code = 200
    mock_response.text = mock_html
    mock_response.headers = {}

    agent = ZimukuAgent()
    mocker.patch.object(agent.client, "get", return_value=mock_response)

    results = await agent.search("test")

    assert len(results) == 2
    assert results[0].title == "Avengers"
    assert "简体" in results[0].lang
    assert "英语" in results[0].lang
    assert results[1].title == "Avatar"
    assert "繁体" in results[1].lang

    await agent.close()


def test_ocr_pixel_logic():
    from app.core.ocr import SimpleOCREngine

    ocr = SimpleOCREngine()
    assert ocr is not None
    # 测试空输入
    assert ocr.recognize("") == ""
