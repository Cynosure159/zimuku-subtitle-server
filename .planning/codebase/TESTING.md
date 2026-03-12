# Testing Patterns

**Analysis Date:** 2026-03-12

## Test Framework

### Python Backend

**Runner:** pytest
- Version: (defined in pyproject.toml dependencies)
- Config: Uses `pyproject.toml` for Ruff configuration only; no dedicated pytest.ini
- No conftest.py found; fixtures defined in individual test files

**Assertion Library:** pytest built-in assertions
- Example: `assert response.status_code == 200`

**Async Support:** pytest-asyncio
- Decorator: `@pytest.mark.asyncio` for async test functions

**Mocking:** pytest-mock
- Fixture: `mocker` (provides `mocker.patch()`, `mocker.patch.object()`)

**Run Commands:**
```bash
pytest                              # Run all tests
pytest tests/test_scraper.py        # Run single test file
pytest -v                           # Verbose output
pytest --tb=short                  # Shorter tracebacks
```

### Frontend

**Framework:** Not currently tested
- No test files found in `frontend/src/`
- No testing framework installed (no jest, vitest in package.json)

## Test File Organization

### Location

**Python tests:** `tests/` directory (project root)
```
tests/
├── test_api.py
├── test_archive.py
├── test_db.py
├── test_media_scan.py
├── test_mcp_server.py
├── test_scraper.py
├── test_scraper_logic.py
├── test_tasks_api.py
└── test_enhanced_api.py
```

**Naming:** `test_*.py` pattern

**Structure:**
- Each file focuses on a specific module/component
- Tests are co-located in a separate directory, not alongside source

### Test Structure

**Typical test file structure:**
```python
import pytest
from fastapi.testclient import TestClient

from app.db.session import create_db_and_tables
from app.main import app

# Module-level client setup
client = TestClient(app)

# Optional: shared fixtures
@pytest.fixture(autouse=True)
def setup_db():
    create_db_and_tables()

def test_something():
    # Arrange
    # Act
    response = client.get("/endpoint")
    # Assert
    assert response.status_code == 200
```

## Test Patterns

### API Testing

**Pattern from `tests/test_api.py`:**
```python
def test_settings_api():
    # Test POST (create/update)
    response = client.post("/settings/", json={"key": "test_api_key", "value": "test_val"})
    assert response.status_code == 200

    # Test GET (list)
    response = client.get("/settings/")
    assert response.status_code == 200
```

**Pattern from `tests/test_tasks_api.py`:**
```python
@pytest.mark.asyncio
async def test_create_and_run_download_task(mocker):
    # 1. Mock external dependencies
    mock_agent = mocker.patch("app.services.task_service.ZimukuAgent", autospec=True)
    instance = mock_agent.return_value
    instance.get_download_page_links.return_value = ["http://example.com/download/file.zip"]
    instance.download_file.return_value = ("test_subtitle.zip", zip_buffer.getvalue())

    # 2. Call API
    payload = {"title": "Test Movie", "source_url": "https://..."}
    response = client.post("/tasks/", params=payload)

    # 3. Assert response
    assert response.status_code == 200
    task_id = response.json()["id"]

    # 4. Verify state change
    with Session(engine) as session:
        task = session.get(SubtitleTask, task_id)
        assert task.status == "completed"
```

### Unit Testing

**Pattern from `tests/test_scraper_logic.py`:**
```python
@pytest.mark.asyncio
async def test_parse_search_results_logic(mocker):
    """Test with mocked HTTP response"""
    # Prepare mock HTML
    mock_html = """
    <html>
        <body>
            <table>
                <tr class="odd">
                    <td><a href="/detail/123.html">Avengers</a></td>
                </tr>
            </table>
        </body>
    </html>
    """

    # Create mock response
    mock_response = mocker.Mock()
    mock_response.status_code = 200
    mock_response.text = mock_html
    mock_response.headers = {}

    # Patch HTTP client
    agent = ZimukuAgent()
    mocker.patch.object(agent.client, "get", return_value=mock_response)

    # Execute and assert
    results = await agent.search("test")
    assert len(results) == 2
```

### Database Testing

**Pattern from `tests/test_db.py`:**
```python
# Use in-memory SQLite
sqlite_url = "sqlite://"
test_engine = create_engine(sqlite_url, connect_args={"check_same_thread": False})

@pytest.fixture(name="session")
def session_fixture():
    SQLModel.metadata.create_all(test_engine)
    with Session(test_engine) as session:
        yield session
    SQLModel.metadata.drop_all(test_engine)

def test_create_setting(session: Session):
    setting = Setting(key="test_key", value="test_value")
    session.add(setting)
    session.commit()
    session.refresh(setting)

    assert setting.id is not None
```

### Service Layer Testing

**Pattern from `tests/test_media_scan.py`:**
```python
@pytest.fixture(name="temp_media_dir")
def temp_media_dir_fixture():
    # Create temporary test directory
    temp_dir = tempfile.mkdtemp()
    # Create mock media files
    movie_dir = Path(temp_dir) / "Interstellar (2014)"
    movie_dir.mkdir()
    (movie_dir / "interstellar.1080p.mkv").touch()
    yield temp_dir
    shutil.rmtree(temp_dir)

@pytest.mark.asyncio
async def test_run_media_scan_logic(session, temp_media_dir):
    # Add scan path
    mp = MediaPath(path=temp_media_dir, type="movie", enabled=True)
    session.add(mp)
    session.commit()

    # Execute scan
    await MediaService.run_media_scan_and_match(session)

    # Verify results
    files = session.exec(select(ScannedFile)).all()
    assert len(files) == 1
```

### Archive Testing

**Pattern from `tests/test_archive.py`:**
```python
def test_zip_extraction_with_encoding():
    test_dir = "tests/tmp_archive"
    os.makedirs(test_dir, exist_ok=True)

    # Create test ZIP with Chinese filename
    zip_path = os.path.join(test_dir, "test.zip")
    with zipfile.ZipFile(zip_path, "w") as z:
        # Simulate encoding issue
        z.writestr(chinese_filename.encode("gbk").decode("cp437"), "content")

    # Extract using ArchiveManager
    files = ArchiveManager.extract(zip_path, extract_to)

    # Assert
    assert len(files) > 0
    assert os.path.exists(expected_path)
```

## Mocking

### What to Mock

**External HTTP calls:** Mock `httpx.AsyncClient.get()` or the agent class
```python
mocker.patch.object(agent.client, "get", return_value=mock_response)
mocker.patch("app.services.task_service.ZimukuAgent", autospec=True)
```

**File system:** Use `tempfile`, `Path` with temporary directories

**Database:** Use in-memory SQLite (`sqlite:///:memory:`)

### What NOT to Mock

- SQLModel/SQLAlchemy session operations (use real DB)
- Business logic that is the test subject
- Simple utility functions without external dependencies

### Mock Patterns

**Class mocking:**
```python
mock_agent = mocker.patch("app.services.task_service.ZimukuAgent", autospec=True)
instance = mock_agent.return_value
instance.method.return_value = expected_value
```

**Method patching:**
```python
mocker.patch.object(agent.client, "get", return_value=mock_response)
```

**Attribute mocking:**
```python
mock_response = mocker.Mock()
mock_response.status_code = 200
mock_response.text = mock_html
```

## Fixtures and Test Data

### Database Fixtures

```python
@pytest.fixture(name="session")
def session_fixture():
    engine = create_engine("sqlite:///:memory:")
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session
```

### Setup/Teardown Fixtures

```python
@pytest.fixture(autouse=True)
def setup_db():
    create_db_and_tables()
    # Runs before each test
    yield
    # No explicit cleanup needed for in-memory DB
```

### Test Data

- Use descriptive names: `test_movie`, `avatar_query`
- Create minimal data needed for each test
- Clean up temporary files after tests

## Coverage

**Current state:** No coverage enforcement
- No `pytest-cov` configuration found
- No coverage target in pyproject.toml

**To view coverage (if installed):**
```bash
pytest --cov=app --cov-report=html
```

## Common Patterns

### Async Testing

```python
@pytest.mark.asyncio
async def test_async_function(mocker):
    # Mock async dependencies
    mock_agent = mocker.patch(...)
    mock_agent.return_value.async_method.return_value = expected

    # Call async function
    result = await service.async_method(...)

    # Assert
    assert result == expected
```

### Error Testing

```python
def test_404_not_found():
    response = client.get("/tasks/99999")
    assert response.status_code == 404

def test_validation_error():
    response = client.post("/tasks/", params={})
    assert response.status_code == 422  # FastAPI validation error
```

### Background Tasks

```python
def test_background_task_trigger():
    response = client.post("/media/match", ...)
    assert response.status_code == 200
    # Task runs in background; verify completion via DB
```

---

*Testing analysis: 2026-03-12*
