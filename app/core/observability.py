import contextlib
import contextvars
import logging
import uuid
from typing import Iterator, Optional

_correlation_id_var: contextvars.ContextVar[str] = contextvars.ContextVar("correlation_id", default="-")
_job_name_var: contextvars.ContextVar[str] = contextvars.ContextVar("job_name", default="-")
_entity_id_var: contextvars.ContextVar[str] = contextvars.ContextVar("entity_id", default="-")


class ContextFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.correlation_id = _correlation_id_var.get()
        record.job_name = _job_name_var.get()
        record.entity_id = _entity_id_var.get()
        return True


def _has_context_filter(filters: list[logging.Filter]) -> bool:
    return any(isinstance(existing_filter, ContextFilter) for existing_filter in filters)


def configure_logging(level: str = "INFO"):
    root_logger = logging.getLogger()
    if not root_logger.handlers:
        logging.basicConfig(
            level=getattr(logging, level.upper(), logging.INFO),
            format=(
                "%(asctime)s %(levelname)s [%(name)s] "
                "[cid=%(correlation_id)s job=%(job_name)s entity=%(entity_id)s] %(message)s"
            ),
        )
    else:
        root_logger.setLevel(getattr(logging, level.upper(), logging.INFO))

    if not _has_context_filter(root_logger.filters):
        root_logger.addFilter(ContextFilter())

    for handler in root_logger.handlers:
        if not _has_context_filter(handler.filters):
            handler.addFilter(ContextFilter())


def get_correlation_id() -> str:
    return _correlation_id_var.get()


@contextlib.contextmanager
def log_context(
    correlation_id: Optional[str] = None,
    job_name: Optional[str] = None,
    entity_id: Optional[str] = None,
) -> Iterator[str]:
    cid = correlation_id or uuid.uuid4().hex[:12]
    cid_token = _correlation_id_var.set(cid)
    job_token = _job_name_var.set(job_name or _job_name_var.get())
    entity_token = _entity_id_var.set(entity_id or _entity_id_var.get())
    try:
        yield cid
    finally:
        _entity_id_var.reset(entity_token)
        _job_name_var.reset(job_token)
        _correlation_id_var.reset(cid_token)
