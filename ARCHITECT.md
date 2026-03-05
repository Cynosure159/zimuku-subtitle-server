# Zimuku Subtitle Server - 详细架构设计 (Detailed Architecture)

## 1. 技术栈与依赖 (Tech Stack)
- **后端 (Backend)**: 
  - `Python 3.10+`
  - `FastAPI`: 异步 Web 框架。
  - `HTTPX`: 支持异步的 HTTP 客户端，处理代理与 Session。
  - `BeautifulSoup4 + lxml`: 高性能 HTML 解析。
  - `SQLModel (SQLAlchemy + Pydantic)`: 数据库 ORM 与数据验证。
  - `python-multipart`: 处理表单数据。
- **OCR 引擎 (OCR Engine)**:
  - `SimpleOCR`: 复刻参考代码的像素采样算法（核心逻辑：`BmpOcr`）。
  - `DdddOCR`: 基于深度学习的开源 OCR（备选，需额外安装依赖）。
- **前端 (Frontend)**: 
  - `Vite + React (TypeScript)`。
  - `Tailwind CSS + Shadcn UI`: 现代化组件库。
  - `Axios`: API 调用。
- **协议 (Protocols)**:
  - `REST API`: 标准前后端通讯。
  - `MCP (Model Context Protocol)`: 为 AI 提供 `zimuku-search` 和 `zimuku-download` 工具。

## 2. 核心模块设计 (Module Breakdown)

### 2.1 `app.core.scraper` (爬虫引擎)
- **ZimukuAgent**: 核心执行类。
  - `search(query: str, filters: dict) -> List[SubtitleResult]`: 多级搜索逻辑。
  - `get_detail(id: str) -> SubtitleDetail`: 获取字幕详情及下载页跳转。
  - `download(url: str) -> FileResponse`: 处理三级跳转下载。
  - `handle_captcha(response: Response) -> str`: 自动识别并绕过验证码。
- **ArchiveManager**: 
  - 支持 ZIP/RAR 解压（使用 `zipfile` 和 `patool`）。
  - `encoding_fixer`: 修复非 UTF-8 编码的 ZIP 文件名乱码（关键技术点：`CP437` -> `GBK`）。

### 2.2 `app.core.ocr` (OCR 抽象)
- **OCRIface**: 定义统一的 `recognize(image_bytes) -> str` 接口。
- **SimpleEngine**: 像素采样实现。
- **DdddEngine**: 封装 `ddddocr` 库。

### 2.3 `app.db` (持久层)
- **Models**:
  - `SubtitleCache`: 缓存搜索到的字幕元数据（ID, Title, Lang, Rating, LastSeen）。
  - `DownloadTask`: 记录下载历史与文件路径。
  - `SystemConfig`: 存储代理设置、OCR 优先级、下载根目录。

## 3. 关键业务流程 (Key Workflows)

### 3.1 搜索流程 (Search Flow)
1. 用户输入关键词 -> API 接收。
2. 检查 SQLite 缓存 -> 若命中且未过期则返回。
3. 否则，`ZimukuAgent` 发起请求 -> 处理可能的验证码挑战。
4. 解析搜索结果 -> 递归进入“季/集页面”提取精确字幕。
5. 结果存入缓存并返回。

### 3.2 下载流程 (Download Flow)
1. 传入详情页 ID -> 获取下载列表。
2. 依次尝试下载链接（Referer 伪装）。
3. 获取二进制流 -> 判断文件类型（如果是压缩包则解压）。
4. 修复文件名乱码 -> 移动至最终存储目录。
5. 更新数据库状态。

## 4. API 接口定义 (Partial)
- `GET /api/v1/search?q=...`: 搜索字幕。
- `POST /api/v1/download/{sub_id}`: 触发下载任务。
- `GET /api/v1/config`: 获取当前系统配置。
- `PUT /api/v1/config`: 更新代理或 OCR 设置。
- `GET /mcp/tools`: 暴露给 MCP 协议的工具描述。

## 5. 存储设计 (Storage)
- **数据库**: `data/zimuku.db` (SQLite)。
- **下载目录**: `/storage/downloads/{YYYY-MM-DD}/{SubName}/`。
- **临时目录**: `/tmp/zimuku_processing/`。
