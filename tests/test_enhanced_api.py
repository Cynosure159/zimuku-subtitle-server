
import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, delete

from app.db.models import MediaPath, SubtitleTask
from app.db.session import create_db_and_tables, engine
from app.main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_db():
    create_db_and_tables()
    # 清空数据以保证测试独立性
    with Session(engine) as session:
        session.exec(delete(SubtitleTask))
        session.exec(delete(MediaPath))
        session.commit()


def test_media_paths_api():
    # 1. 添加路径
    response = client.post("/media/paths", params={"path": "F:/movies", "path_type": "movie"})
    assert response.status_code == 200
    data = response.json()
    assert data["path"] == "F:/movies"
    assert data["type"] == "movie"
    path_id = data["id"]

    # 重复添加应报错
    response = client.post("/media/paths", params={"path": "F:/movies", "path_type": "movie"})
    assert response.status_code == 400

    # 2. 列出路径
    response = client.get("/media/paths")
    assert response.status_code == 200
    assert len(response.json()) >= 1

    # 3. 更新路径
    response = client.patch(f"/media/paths/{path_id}", params={"enabled": False})
    assert response.status_code == 200
    assert response.json()["enabled"] is False

    # 4. 删除路径
    response = client.delete(f"/media/paths/{path_id}")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_system_stats_api():
    # 准备一些数据
    with Session(engine) as session:
        session.add(SubtitleTask(title="T1", source_url="url1", status="completed"))
        session.add(SubtitleTask(title="T2", source_url="url2", status="failed"))
        session.commit()

    response = client.get("/system/stats")
    assert response.status_code == 200
    data = response.json()
    assert data["tasks"]["completed"] == 1
    assert data["tasks"]["failed"] == 1
    assert "storage" in data


def test_get_logs_api():
    # 模拟日志文件
    log_file = "app.log"
    with open(log_file, "w", encoding="utf-8") as f:
        f.write("Line 1\nLine 2\nLine 3\n")

    try:
        response = client.get("/system/logs", params={"lines": 2})
        assert response.status_code == 200
        logs = response.json()
        assert len(logs) == 2
        assert logs[-1].strip() == "Line 3"
    finally:
        # 最好不要删，或者在正式环境不产生此文件
        pass


def test_trigger_match_api():
    response = client.post("/media/match")
    assert response.status_code == 200
    assert "started" in response.json()["message"]
