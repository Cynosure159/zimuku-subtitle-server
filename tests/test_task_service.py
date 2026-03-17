import os
import shutil
import tempfile

import pytest
from sqlmodel import Session, SQLModel, create_engine, select

from app.db.models import SubtitleTask
from app.services.task_service import TaskService

# 使用内存数据库进行测试
sqlite_url = "sqlite://"
test_engine = create_engine(sqlite_url, connect_args={"check_same_thread": False})


@pytest.fixture(name="session")
def session_fixture():
    SQLModel.metadata.create_all(test_engine)
    with Session(test_engine) as session:
        yield session
    SQLModel.metadata.drop_all(test_engine)


def test_create_task(session):
    """Test creating a task"""
    task = TaskService.create_task(
        session=session,
        title="Avatar",
        source_url="http://example.com/avatar",
        target_path="/movies/avatar.mp4",
        target_type="movie",
        language="zh-CN",
    )

    assert task.id is not None
    assert task.title == "Avatar"
    assert task.source_url == "http://example.com/avatar"
    assert task.status == "pending"
    assert task.target_path == "/movies/avatar.mp4"
    assert task.target_type == "movie"
    assert task.language == "zh-CN"


def test_get_task(session):
    """Test getting a task by ID"""
    # Create a task first
    created_task = TaskService.create_task(
        session=session,
        title="Test Movie",
        source_url="http://example.com/test",
    )

    # Get the task
    retrieved_task = TaskService.get_task(session, created_task.id)

    assert retrieved_task is not None
    assert retrieved_task.id == created_task.id
    assert retrieved_task.title == "Test Movie"


def test_get_task_not_found(session):
    """Test getting a non-existent task returns None"""
    result = TaskService.get_task(session, 9999)
    assert result is None


def test_list_tasks_default(session):
    """Test listing tasks with default pagination"""
    # Create multiple tasks
    for i in range(5):
        TaskService.create_task(
            session=session,
            title=f"Task {i}",
            source_url=f"http://example.com/{i}",
        )

    tasks, total = TaskService.list_tasks(session)

    assert total == 5
    assert len(tasks) == 5


def test_list_tasks_pagination(session):
    """Test listing tasks with pagination"""
    # Create 10 tasks
    for i in range(10):
        TaskService.create_task(
            session=session,
            title=f"Task {i}",
            source_url=f"http://example.com/{i}",
        )

    # Get first page (limit=3)
    tasks_page1, total = TaskService.list_tasks(session, offset=0, limit=3)

    assert total == 10
    assert len(tasks_page1) == 3


def test_list_tasks_status_filter(session):
    """Test listing tasks with status filter"""
    # Create tasks with different statuses
    task1 = TaskService.create_task(session, title="Task 1", source_url="http://example.com/1")
    task2 = TaskService.create_task(session, title="Task 2", source_url="http://example.com/2")
    _task3 = TaskService.create_task(session, title="Task 3", source_url="http://example.com/3")
    task1.status = "completed"
    task2.status = "failed"
    session.add(task1)
    session.add(task2)
    session.commit()

    # Filter by pending
    pending_tasks, total = TaskService.list_tasks(session, status="pending")

    assert total == 1
    assert pending_tasks[0].title == "Task 3"

    # Filter by completed
    completed_tasks, total = TaskService.list_tasks(session, status="completed")

    assert total == 1
    assert completed_tasks[0].title == "Task 1"


def test_delete_task(session):
    """Test deleting a task without deleting files"""
    task = TaskService.create_task(
        session=session,
        title="To Delete",
        source_url="http://example.com/delete",
    )
    task_id = task.id

    result = TaskService.delete_task(session, task_id, delete_files=False)

    assert result is True

    # Verify task is deleted
    deleted_task = TaskService.get_task(session, task_id)
    assert deleted_task is None


def test_delete_task_not_found(session):
    """Test deleting a non-existent task returns False"""
    result = TaskService.delete_task(session, 9999)
    assert result is False


def test_delete_task_with_files(session):
    """Test deleting a task and its associated files"""
    # Create a temporary file
    temp_dir = tempfile.mkdtemp()
    test_file = os.path.join(temp_dir, "test.srt")
    with open(test_file, "w") as f:
        f.write("test subtitle content")

    # Create task with save_path
    task = TaskService.create_task(
        session=session,
        title="Task With File",
        source_url="http://example.com/file",
    )
    task.save_path = test_file
    session.add(task)
    session.commit()

    task_id = task.id

    # Delete with files
    result = TaskService.delete_task(session, task_id, delete_files=True)

    assert result is True
    assert not os.path.exists(test_file)
    shutil.rmtree(temp_dir)


def test_retry_task(session):
    """Test retrying a failed task"""
    # Create a failed task
    task = TaskService.create_task(
        session=session,
        title="Failed Task",
        source_url="http://example.com/failed",
    )
    task.status = "failed"
    task.error_msg = "Network error"
    session.add(task)
    session.commit()

    # Retry the task
    retried_task = TaskService.retry_task(session, task.id)

    assert retried_task is not None
    assert retried_task.status == "pending"
    assert retried_task.error_msg is None


def test_retry_task_not_failed(session):
    """Test retrying a non-failed task returns None"""
    task = TaskService.create_task(
        session=session,
        title="Pending Task",
        source_url="http://example.com/pending",
    )

    result = TaskService.retry_task(session, task.id)

    assert result is None


def test_retry_task_not_found(session):
    """Test retrying non-existent task returns None"""
    result = TaskService.retry_task(session, 9999)
    assert result is None


def test_clear_completed(session):
    """Test clearing completed tasks"""
    # Create tasks
    task1 = TaskService.create_task(session, title="Task 1", source_url="http://example.com/1")
    task2 = TaskService.create_task(session, title="Task 2", source_url="http://example.com/2")
    _task3 = TaskService.create_task(session, title="Task 3", source_url="http://example.com/3")

    # Update some to completed
    task1.status = "completed"
    task2.status = "completed"
    session.add(task1)
    session.add(task2)
    session.commit()

    # Clear completed
    count = TaskService.clear_completed(session)

    assert count == 2

    # Verify only task3 remains
    remaining = session.exec(select(SubtitleTask)).all()
    assert len(remaining) == 1
    assert remaining[0].title == "Task 3"


def test_clear_completed_none_exist(session):
    """Test clearing when no completed tasks exist"""
    TaskService.create_task(session, title="Task 1", source_url="http://example.com/1")

    count = TaskService.clear_completed(session)

    assert count == 0


def test_create_task_with_season_episode(session):
    """Test creating a TV episode task"""
    task = TaskService.create_task(
        session=session,
        title="The Last of Us",
        source_url="http://example.com/tlou",
        target_path="/tv/The Last of Us",
        target_type="tv",
        season=1,
        episode=5,
        language="en",
    )

    assert task.season == 1
    assert task.episode == 5
    assert task.target_type == "tv"


def test_list_tasks_order_by_created_at(session):
    """Test that list_tasks returns tasks ordered by created_at descending"""
    # Create tasks with slight delays
    _task1 = TaskService.create_task(session, title="First", source_url="http://first.com")
    _task2 = TaskService.create_task(session, title="Second", source_url="http://second.com")
    _task3 = TaskService.create_task(session, title="Third", source_url="http://third.com")

    tasks, total = TaskService.list_tasks(session)

    # Most recent first
    assert tasks[0].title == "Third"
    assert tasks[1].title == "Second"
    assert tasks[2].title == "First"
