import time
from unittest.mock import AsyncMock

import httpx
import pytest

from app.core.scraper.agent import ZimukuAgent


class DummyClient:
    def __init__(self, responses):
        self._responses = list(responses)
        self.calls = []

    async def get(self, url, headers=None):
        self.calls.append((url, headers))
        response = self._responses.pop(0)
        if isinstance(response, Exception):
            raise response
        return response

    async def aclose(self):
        return None


@pytest.mark.anyio
async def test_get_page_retries_after_timeout(monkeypatch):
    sleep = AsyncMock()
    request = httpx.Request("GET", "https://example.com/page")
    client = DummyClient(
        [
            httpx.ReadTimeout("boom", request=request),
            httpx.Response(200, text="<html>ok</html>", request=request),
        ]
    )

    monkeypatch.setenv("ZIMUKU_REQUEST_MAX_RETRIES", "2")
    monkeypatch.setenv("ZIMUKU_REQUEST_BACKOFF_SECONDS", "0.5")
    monkeypatch.setenv("ZIMUKU_REQUEST_MIN_INTERVAL_SECONDS", "999")

    agent = ZimukuAgent(base_url="https://example.com", client=client, sleep_func=sleep)
    agent._wait_for_request_slot = AsyncMock()

    html = await agent._get_page("https://example.com/page")

    assert html == "<html>ok</html>"
    assert len(client.calls) == 2
    sleep.assert_awaited_once_with(0.5)


@pytest.mark.anyio
async def test_wait_for_request_slot_applies_min_interval(monkeypatch):
    sleep_calls = []

    async def fake_sleep(seconds: float):
        sleep_calls.append(seconds)

    client = DummyClient([])
    monkeypatch.setenv("ZIMUKU_REQUEST_MIN_INTERVAL_SECONDS", "1.0")
    agent = ZimukuAgent(base_url="https://example.com", client=client, sleep_func=fake_sleep)
    agent._last_request_at = time.monotonic()

    await agent._wait_for_request_slot()

    assert len(sleep_calls) == 1
    assert sleep_calls[0] == pytest.approx(1.0, abs=0.05)
