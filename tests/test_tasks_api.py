import io
import zipfile
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, delete

from app.db.models import SubtitleTask
from app.db.session import create_db_and_tables, engine
from app.main import app

client = TestClient(app)
no_raise_client = TestClient(app, raise_server_exceptions=False)


@pytest.fixture(autouse=True)
def setup_db():
    create_db_and_tables()
    with Session(engine) as session:
        session.exec(delete(SubtitleTask))
        session.commit()


@pytest.mark.anyio
async def test_create_and_run_download_task():
    # 1. Mock ZimukuAgent 的关键方法
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "a", zipfile.ZIP_DEFLATED, False) as zip_file:
        zip_file.writestr("test.srt", "subtitle content")

    with patch("app.services.download_workflow.ZimukuAgent") as mock_agent:
        instance = mock_agent.return_value
        instance.get_download_page_links = AsyncMock(return_value=["http://example.com/download/file.zip"])
        instance.download_file = AsyncMock(return_value=("test_subtitle.zip", zip_buffer.getvalue()))
        instance.close = AsyncMock(return_value=None)

        # 2. 调用 API 创建下载任务
        payload = {"title": "Test Movie", "source_url": "https://zimuku.org/detail/123.html"}
        response = client.post("/tasks/", params=payload)
        assert response.status_code == 200
        task_id = response.json()["id"]

        # 3. 验证状态
        with Session(engine) as session:
            task = session.get(SubtitleTask, task_id)
            assert task is not None
            assert task.status == "completed"


def test_global_exception_handler_hides_internal_message():
    @app.get("/_test/error")
    async def raise_error():
        raise RuntimeError("secret failure detail")

    response = no_raise_client.get("/_test/error")

    assert response.status_code == 500
    assert response.json() == {"detail": "内部服务器错误"}


def test_get_task_status():
    with Session(engine) as session:
        task = SubtitleTask(title="Status Test", source_url="http://test.com")
        session.add(task)
        session.commit()
        session.refresh(task)
        task_id = task.id

    response = client.get(f"/tasks/{task_id}")
    assert response.status_code == 200
    assert response.json()["title"] == "Status Test"

    # 测试 404
    response = client.get("/tasks/99999")
    assert response.status_code == 404


def test_list_tasks_api():
    client.post("/tasks/", params={"title": "List Test", "source_url": "http://test.com"})
    response = client.get("/tasks/")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1


def test_delete_task_api():
    resp = client.post("/tasks/", params={"title": "Delete Test", "source_url": "http://test.com"})
    task_id = resp.json()["id"]

    response = client.delete(f"/tasks/{task_id}")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_retry_failed_task():
    with Session(engine) as session:
        task = SubtitleTask(title="Retry Test", source_url="http://test.com", status="failed")
        session.add(task)
        session.commit()
        session.refresh(task)
        task_id = task.id

    with patch("app.services.download_workflow.ZimukuAgent") as mock_agent:
        instance = mock_agent.return_value
        instance.get_download_page_links = AsyncMock(return_value=["http://example.com/retry.zip"])
        instance.download_file = AsyncMock(return_value=("retry.zip", b"content"))
        instance.close = AsyncMock(return_value=None)

        response = client.post(f"/tasks/{task_id}/retry")
        assert response.status_code == 200
        assert response.json()["status"] == "pending"

    # 测试非失败任务不能重试
    with Session(engine) as session:
        task.status = "completed"
        session.add(task)
        session.commit()
    response = client.post(f"/tasks/{task_id}/retry")
    assert response.status_code == 400


def test_clear_completed_tasks():
    with Session(engine) as session:
        session.add(SubtitleTask(title="C1", source_url="u1", status="completed"))
        session.add(SubtitleTask(title="C2", source_url="u2", status="pending"))
        session.commit()

    response = client.post("/tasks/clear-completed")
    assert response.status_code == 200
    assert response.json()["cleared_count"] == 1

    with Session(engine) as session:
        from sqlmodel import select

        tasks = session.exec(select(SubtitleTask)).all()
        assert len(tasks) == 1
        assert tasks[0].title == "C2"
