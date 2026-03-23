import io
import os
import shutil
import zipfile
from pathlib import Path

import pytest

_PROJECT_ROOT = Path(__file__).resolve().parents[1]
_TEST_RUNTIME_DIR = _PROJECT_ROOT / ".tmp" / "test-runtime"
shutil.rmtree(_TEST_RUNTIME_DIR, ignore_errors=True)
_TEST_RUNTIME_DIR.mkdir(parents=True, exist_ok=True)

os.environ["ZIMUKU_DB_PATH"] = str(_TEST_RUNTIME_DIR / "zimuku-test.db")
os.environ["ZIMUKU_STORAGE_PATH"] = str(_TEST_RUNTIME_DIR / "storage")


@pytest.fixture(scope="session", autouse=True)
def cleanup_test_runtime():
    yield
    shutil.rmtree(_TEST_RUNTIME_DIR, ignore_errors=True)


@pytest.fixture
def subtitle_zip_bytes():
    def _build(entries: dict[str, str | bytes]) -> bytes:
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
            for name, content in entries.items():
                data = content.encode("utf-8") if isinstance(content, str) else content
                archive.writestr(name, data)
        return buffer.getvalue()

    return _build


@pytest.fixture
def create_media_file(tmp_path):
    def _create(relative_path: str, content: str = "") -> Path:
        file_path = tmp_path / relative_path
        file_path.parent.mkdir(parents=True, exist_ok=True)
        file_path.write_text(content, encoding="utf-8")
        return file_path

    return _create
