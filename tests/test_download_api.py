import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.db.models import SubtitleTask
from app.db.session import create_db_and_tables, engine
from app.main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_db():
    create_db_and_tables()


@pytest.mark.asyncio
async def test_create_and_run_download_task(mocker):
    # 1. Mock ZimukuAgent 的关键方法
    import io
    import zipfile

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "a", zipfile.ZIP_DEFLATED, False) as zip_file:
        zip_file.writestr("test.srt", "subtitle content")

    mock_agent = mocker.patch("app.api.download.ZimukuAgent", autospec=True)
    instance = mock_agent.return_value
    instance.get_download_page_links.return_value = ["http://example.com/download/file.zip"]
    instance.download_file.return_value = ("test_subtitle.zip", zip_buffer.getvalue())
    instance.close.return_value = None

    # 2. 调用 API 创建下载任务
    payload = {"title": "Test Movie", "source_url": "https://zimuku.org/detail/123.html"}
    # 注意：FastAPI 的 BackgroundTasks 在 TestClient 中是同步运行的，方便测试
    response = client.post("/download/", params=payload)
    assert response.status_code == 200
    task_id = response.json()["task_id"]

    # 3. 验证数据库中的任务状态
    with Session(engine) as session:
        # 由于 BackgroundTasks 在 TestClient 中执行完请求后会立即执行
        # 我们直接检查最终状态
        task = session.get(SubtitleTask, task_id)
        assert task is not None
        assert task.status == "completed"
        assert task.filename == "test_subtitle.zip"
        assert "storage/downloads" in task.save_path


def test_list_download_tasks():
    # 先创建一个任务
    client.post("/download/", params={"title": "List Test", "source_url": "http://test.com"})

    response = client.get("/download/")
    assert response.status_code == 200
    tasks = response.json()
    assert len(tasks) >= 1
    assert tasks[0]["title"] == "List Test"
