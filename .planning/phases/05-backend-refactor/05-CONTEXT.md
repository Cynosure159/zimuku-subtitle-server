# Phase 5: 后端代码结构优化整理 - Context

**Gathered:** 2026-03-15
**Status:** Ready for planning

<domain>
## Phase Boundary

优化后端代码结构，使其更可读、可拓展、可复用，符合代码架构规范，目录层级明确。此重构仅优化代码结构，不改变现有功能行为。

</domain>

<decisions>
## Implementation Decisions

### 模块组织方式
- **混合方式**: 业务模块 + 共享层级
- 主要业务(media, search, tasks)按模块拆分，每个模块包含自己的 api + service
- 共享逻辑(core, db, utils)保持按层级组织

### 层级划分
- **API → Service → Core** 三层架构
- **API 层**: 接收请求、参数校验、调用 Service、返回响应
- **Service 层**: 业务逻辑、事务控制
- **Core 层**: 底层操作(爬虫/文件处理/OCR)
- **禁止**: API 层直接调用 Core 层，必须通过 Service 层

### 文件命名规范
- **业务命名**: 使用业务相关名称，如 media_service.py, search_router.py, task_models.py
- 不使用通用名称如 scraper.py, service.py

### 目录结构目标
```
app/
├── api/              # 路由层（按业务拆分）
│   ├── media.py
│   ├── search.py
│   ├── tasks.py
│   └── ...
├── services/        # 业务逻辑层
│   ├── media_service.py
│   ├── search_service.py
│   ├── task_service.py
│   └── ...
├── core/            # 底层实现（共享）
│   ├── scraper/     # 爬虫模块
│   ├── archive/     # 解压模块
│   ├── ocr/        # OCR 模块
│   └── config.py
├── db/              # 数据层
│   ├── models.py
│   └── session.py
└── main.py
```

### Claude's Discretion
- 具体的文件移动和重命名操作顺序
- 是否有需要合并或拆分的现有文件
- 如何处理循环导入问题
- 是否需要添加 __init__.py 导出

</decisions>

<specifics>
## Specific Ideas

- "后端代码结构优化整理，使其可读、可拓展、可复用性更好"
- "符合代码架构规范，代码目录层级明确"

</specifics>

## Existing Code Insights

### Current Structure
- app/api/ - REST endpoints (media, search, tasks, settings, system)
- app/core/ - core business logic (scraper, archive, ocr, config, metadata, utils)
- app/db/ - database models and session
- app/services/ - service layer (MediaService, SearchService, TaskService, SystemService)
- app/mcp/ - MCP protocol

### Issues to Address
- API 直接调用 Core，缺少 Service 层桥接
- 通用命名(scraper.py, service.py)不够清晰
- core/ 目录混合了多个不相关的模块

### Reusable Assets
- 现有 Service 类: MediaService, SearchService, TaskService, SystemService
- 现有 Core 模块: scraper, archive, ocr, config

### Integration Points
- 需要重构 API 调用链: API → Service → Core
- 需要重新组织 core/ 目录结构

</deferred>

<deferred>
## Deferred Ideas

- 前端代码结构优化 - 未来讨论
- TypeScript 类型定义文件(.pyi) - 后续考虑

</deferred>

---

*Phase: 05-backend-refactor*
*Context gathered: 2026-03-15*
