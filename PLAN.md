# Zimuku Subtitle Server - 执行计划 (Execution Plan)

## 阶段 1：核心爬虫与 OCR 引擎开发 (关键路径)
**目标**: 实现无需 UI 的搜索与验证码绕过。
- [ ] **Task 1.1**: 搭建 Python 虚拟环境，安装 `httpx`, `beautifulsoup4`, `lxml`。
- [ ] **Task 1.2**: 实现 `SimpleOCR`。复刻像素采样逻辑，能够识别 Base64 验证码。
- [ ] **Task 1.3**: 实现 `ZimukuAgent` 的核心搜索逻辑。支持多级页面解析。
- [ ] **Task 1.4**: 实现验证码挑战机制。模拟重定向获取授权 Cookie。
- [ ] **Task 1.5**: 编写测试脚本（`tests/test_scraper.py`），验证搜索与 OCR 识别率。

## 阶段 2：数据库与 FastAPI 基础架构
**目标**: 提供持久化支持与 REST 接口。
- [ ] **Task 2.1**: 使用 `SQLModel` 定义数据模型（配置、缓存、任务）。
- [ ] **Task 2.2**: 初始化 FastAPI 框架，配置全局异常处理与日志。
- [ ] **Task 2.3**: 开发配置 API。支持在线修改代理地址与主域。
- [ ] **Task 2.4**: 实现搜索 API（带 SQLite 缓存逻辑）。
- [ ] **Task 2.5**: 编写测试脚本，验证数据库 CRUD。

## 阶段 3：下载服务与 MCP 协议集成
**目标**: 实现完整下载流程与 AI 代理支持。
- [ ] **Task 3.1**: 开发下载路由。处理多步跳转下载。
- [ ] **Task 3.2**: 开发 `ArchiveManager`。支持解压与文件名乱码修正（`CP437` -> `GBK`）。
- [ ] **Task 3.3**: 集成 MCP SDK。暴露搜索与下载为 MCP Tools。
- [ ] **Task 3.4**: 手动在 Claude/Gemini 中通过 MCP 测试下载功能。

## 阶段 4：Web UI 面板开发
**目标**: 提升用户体验。
- [ ] **Task 4.1**: 初始化 Vite + React 项目。
- [ ] **Task 4.2**: 核心页面开发。极简搜索页（带语言筛选）。
- [ ] **Task 4.3**: 系统配置页。支持代理设置与 OCR 引擎切换。
- [ ] **Task 4.4**: 任务管理页。展示已下载字幕列表。

## 阶段 5：容器化与文档交付
**目标**: 易于部署。
- [ ] **Task 5.1**: 编写 `Dockerfile`。多阶段构建（前端编译 + 后端打包）。
- [ ] **Task 5.2**: 编写 `docker-compose.yml`。配置卷挂载与端口。
- [ ] **Task 5.3**: 完善 `README.md`。提供安装引导与 API 文档链接。

## 验收标准 (Definition of Done)
1. **成功搜索**: 输入“复仇者联盟”能返回带语言标识的字幕列表。
2. **自动下载**: 能够下载 ZIP 包并自动解压出 `.srt/.ass` 到 `/storage` 目录。
3. **乱码修复**: 解压后的中文文件名在现代 OS 上无乱码。
4. **验证码绕过**: 在触发验证码时，OCR 识别成功率不低于 85%，无需人工干预。
5. **API 文档**: Swagger UI (/docs) 自动生成。
