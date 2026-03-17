import pytest
from sqlmodel import Session, SQLModel, create_engine, select

from app.db.models import ScannedFile
from app.services.media_service import MediaService

# Use in-memory database for testing
sqlite_url = "sqlite://"
test_engine = create_engine(sqlite_url, connect_args={"check_same_thread": False})


@pytest.fixture(name="session")
def session_fixture():
    SQLModel.metadata.create_all(test_engine)
    with Session(test_engine) as session:
        yield session
    SQLModel.metadata.drop_all(test_engine)


def test_list_paths(session):
    """Test listing all media paths"""
    # Add some paths
    MediaService.add_path(session, "/movies", "movie")
    MediaService.add_path(session, "/tv", "tv")

    paths = MediaService.list_paths(session)

    assert len(paths) == 2
    assert paths[0].path == "/movies"
    assert paths[1].path == "/tv"


def test_list_paths_empty(session):
    """Test listing paths when none exist"""
    paths = MediaService.list_paths(session)
    assert paths == []


def test_add_path_duplicate(session):
    """Test adding duplicate path raises ValueError"""
    MediaService.add_path(session, "/movies", "movie")

    with pytest.raises(ValueError, match="Path already exists"):
        MediaService.add_path(session, "/movies", "movie")


def test_add_path_success(session):
    """Test adding a new path"""
    path = MediaService.add_path(session, "/downloads", "tv")

    assert path.id is not None
    assert path.path == "/downloads"
    assert path.type == "tv"
    assert path.enabled is True


def test_delete_path(session):
    """Test deleting a path and its associated scanned files"""
    # Add path
    media_path = MediaService.add_path(session, "/movies", "movie")

    # Add scanned file associated with this path
    scanned_file = ScannedFile(
        path_id=media_path.id,
        type="movie",
        file_path="/movies/avatar.mp4",
        filename="avatar.mp4",
    )
    session.add(scanned_file)
    session.commit()

    # Delete path
    result = MediaService.delete_path(session, media_path.id)

    assert result is True

    # Verify path is deleted
    paths = MediaService.list_paths(session)
    assert len(paths) == 0

    # Verify scanned files are deleted
    files = session.exec(select(ScannedFile)).all()
    assert len(files) == 0


def test_delete_path_not_found(session):
    """Test deleting non-existent path returns False"""
    result = MediaService.delete_path(session, 9999)
    assert result is False


def test_update_path(session):
    """Test updating path properties"""
    media_path = MediaService.add_path(session, "/movies", "movie")

    # Update path
    updated = MediaService.update_path(session, media_path.id, enabled=False, path_type="tv")

    assert updated.enabled is False
    assert updated.type == "tv"


def test_update_path_partial(session):
    """Test updating only enabled property"""
    media_path = MediaService.add_path(session, "/movies", "movie")

    updated = MediaService.update_path(session, media_path.id, enabled=False)

    assert updated.enabled is False
    assert updated.type == "movie"  # Unchanged


def test_update_path_not_found(session):
    """Test updating non-existent path returns None"""
    result = MediaService.update_path(session, 9999, enabled=False)
    assert result is None


def test_list_files_no_filter(session):
    """Test listing all scanned files without filter"""
    # Add path
    media_path = MediaService.add_path(session, "/movies", "movie")

    # Add scanned files
    file1 = ScannedFile(path_id=media_path.id, type="movie", file_path="/movies/avatar.mp4", filename="avatar.mp4")
    file2 = ScannedFile(path_id=media_path.id, type="movie", file_path="/movies/test.mp4", filename="test.mp4")
    session.add_all([file1, file2])
    session.commit()

    files = MediaService.list_files(session)

    assert len(files) == 2


def test_list_files_filtered_by_type(session):
    """Test listing files filtered by type"""
    # Add paths
    movie_path = MediaService.add_path(session, "/movies", "movie")
    tv_path = MediaService.add_path(session, "/tv", "tv")

    # Add scanned files
    movie_file = ScannedFile(path_id=movie_path.id, type="movie", file_path="/movies/avatar.mp4", filename="avatar.mp4")
    tv_file = ScannedFile(path_id=tv_path.id, type="tv", file_path="/tv/show.mp4", filename="show.mp4")
    session.add_all([movie_file, tv_file])
    session.commit()

    # Filter by movie
    movie_files = MediaService.list_files(session, path_type="movie")

    assert len(movie_files) == 1
    assert movie_files[0].type == "movie"

    # Filter by tv
    tv_files = MediaService.list_files(session, path_type="tv")

    assert len(tv_files) == 1
    assert tv_files[0].type == "tv"


def test_list_files_empty(session):
    """Test listing files when none exist"""
    files = MediaService.list_files(session)
    assert files == []
