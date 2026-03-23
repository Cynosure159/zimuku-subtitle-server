import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .db.session import create_db_and_tables

# 使用环境变量控制日志级别（支持 LOG_LEVEL 或 UVICORN_LOG_LEVEL）
log_level = os.environ.get("LOG_LEVEL", os.environ.get("UVICORN_LOG_LEVEL", "INFO")).upper()
logging.basicConfig(
    level=getattr(logging, log_level, logging.INFO),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动时执行：初始化数据库
    logger.info("正在初始化数据库表...")
    try:
        create_db_and_tables()
        logger.info("数据库表初始化成功。")
    except Exception as e:
        logger.error(f"数据库表初始化失败: {e}")
    yield
    # 关闭时执行
    logger.info("正在关闭应用...")


from .api import media, search, settings, system, tasks

app = FastAPI(
    title="Zimuku Subtitle Server", description="独立的字幕管理与刮削服务", version="0.1.0", lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"全局未捕获异常: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "内部服务器错误"},
    )


app.include_router(search.router)
app.include_router(settings.router)
app.include_router(tasks.router)
app.include_router(media.router)
app.include_router(system.router)


@app.get("/health", tags=["System"])
async def health_check():
    """健康检查"""
    return {"status": "ok"}


@app.get("/", include_in_schema=False)
async def root():
    return {"message": "Welcome to Zimuku Subtitle Server API. Visit /docs for documentation."}
