# Zimuku Subtitle Server 代码重构与优化计划

通过对当前项目全代码的审查，针对“工程规范”、“易读性”、“可靠性”、“可复用性”和“可维护性”，整理出以下重构与优化计划。

> **背景**：当前项目实现了完整的功能闭环（前后端分离、爬虫、自动化匹配、MCP等），但在模块拆分解耦、并发状态管理和复用性上还有较大的重构空间。

---

## 1. 架构与业务逻辑分层优化 (Architecture & Decoupling)

### 1.1 API 层与业务逻辑混杂
- **现状**：`app/api/media.py` 中的端点函数包含了过多核心业务逻辑（例如 `run_auto_match_process` 有上百行代码，包含下载、目录创建、解压、文件比对、移动、DB 状态更新；还有 `parse_media_filename` 正则解析，以及嵌套在其中的打分算法 `get_sub_score`）。
- **优化方案**：
  - **引入 Service 业务层**：增加类似 `app/core/media_service.py` 和 `app/core/match_service.py`。将目录扫描、自动匹配的后台处理迁移出路由层，`media.py` 内部仅作请求转发和参数校验。
  - **纯函数分离**：将 `parse_media_filename` 提取到 `app/core/utils.py`；将内部嵌套的 `get_sub_score` 提取为独立模块函数以支持单元测试与解。

### 1.2 全局内存状态的安全隐患
- **现状**：`app/api/media.py` 定义了全局单例 `global_task_status = TaskStatus()` 进行异步状态跟踪和轮询。在多 Worker/分布式部署下会立刻失效，导致状态错乱和数据丢失。
- **优化方案**：
  - **建议**：取消内存全局变量。将匹配和扫描任务转交给现有的持久化任务机制（在 `SubtitleTask` 中增加相应 enum 类型）或者使用 Redis、SQlite 构建专门的任务流状态表，保证多进程下的可靠性。

---

## 2. 数据库会话与并发控制 (Reliability & Robustness)

### 2.1 后台任务的大忌：Session 生命周期泄漏
- **现状**：在 `app/api/tasks.py` 等文件中，后台方法使用 `background_tasks.add_task(run_download_task, task.id, session)` 将注入进来的请求 `Session` 直接传递给后台线程。当主请求结束后，Session 会被引擎关闭或归还连接池，而仍在下载文件的后台任务随后发起 `.commit()` 会导致 `Routing/PendingRollbackError` 及 `Session is closed` 等致命异常。
- **优化方案**：
  - 路由层面不要将 `Session` 对象传给 `background_tasks`，只传递 `task_id`。
  - 在后台任务内部显式自己声明带有上下文管理的数据库实例（例如 `with Session(engine) as session:`），保证 DB 操作与其执行生命周期一致。

### 2.2 数据库路径参数硬编码
- **现状**：`app/db/session.py` 中写死了 `DB_PATH = "storage/zimuku.db"`。这种写法阻碍了系统按环境灵活配置或 Docker 数据卷挂载定制。
- **优化方案**：
  - 通过注入使用 `ConfigManager.get("storage_path")` 或环境变量自动合成数据库路径。

### 2.3 数据一致性问题（非原子删除）
- **现状**：删除 `MediaPath` 时，先查关联文件再各自删除并 `session.commit()`，然后再去查取外键关联的主记录 `MediaPath` 再次 `delete` 与 `commit()`。流程非原子化，如中途出错会产生关联废数据。
- **优化方案**：
  - 借助 SQLModel / SQLAlchemy 在 Schema 层宣告使用 `级联删除 CASCADE` 配置，或者在同一个事务逻辑块内删完全部再集中 `commit()`，保持 ACID 操作原子特性。

---

## 3. 爬虫与处理底层的健壮性 (Scraping Hardening)

### 3.1 假文件校验的局限性
- **现状**：`scraper.py` 里的 `download_file` 逻辑通过长度校验 `last_data_size == len(data)` 来尝试允许极小文件，但这会使站点返回同一个 500、403、或者包含重定向脚本的 HTML 页面两次（大小相同）时，系统错误判定为合法并当做极小字幕包下载处理。
- **优化方案**：
  - 不单纯依靠包大小，应该补充校验字节流前面的 Magic bytes（如 ZIP: `PK\x03\x04`，7z: `7z\xbc\xaf\x27\x1c` 等）或者通过后缀结合纯文本标识，以严格区分有效的压缩包与报错页面。

### 3.2 代理客户端重用机制
- **现状**：带有异常截获时的后退直连代理（一旦 ConnectError，则即时生成一个新的无代理 `httpx.AsyncClient()` 强行 `get`）。临时客户端在上下文中缺乏并发管控以及连接池化复用。
- **优化方案**：
  - 在初始化 `ZimukuAgent` 时准备好两套预热过的长连接 Client（代理与直连）。或者封装一套 `HttpClientManager` 进行统一的回退包装。

---

## 4. 前端组件化与 DRY 原则 (Frontend Maintainability)

### 4.1 React 代码高度重复
- **现状**：`MoviesPage.tsx` 和 `SeriesPage.tsx` 的代码呈现出超过 60-70% 的一比一复制。两者皆持有完全雷同的顶部操作栏（Header）、添加监控路径面版（Path Config Modal）、列表轮询与获取（Fetch & Poll 流程）、手动/自动触发事件等。
- **优化方案**：
  - **组件提取**：提炼共用的 `<PathConfigPanel type="movie | tv" />`、`<MediaLeftSidebar />`、`<MediaEmptyState />` 来缩减冗长的页级文件。
  - **Hook 提取**：将包含防抖和错误控制的数据查询/任务追踪抽象为 `useMediaPolling("movie")`；把高度雷同的状态与处理逻辑提取为公共 Hook。

---

## 5. 详细行动与落地指引 (Next Steps)

1. **Bug 优先**：修复 API 路由中的 `Session` 生命周期直接传导到后台任务的问题，避免服务死锁或崩溃。
2. **逻辑切分**：将 `api/media.py` 中的核心功能如（基于名称打分 `get_sub_score`）抽出成无副作用的独立 Core Function。
3. **消除内部全局状态**：把异步操作过程状态用数据库统一监控，提升稳定性。
4. **前端剥离重组**：从结构雷同的电影和剧集页面中，提炼复用的通用面板与 Hook 逻辑。

以上内容针对现有项目结构规划，待项目需要开展更严谨代码审查与开发时，依循上述路线即可进行逐步重构。
