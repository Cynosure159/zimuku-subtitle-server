# Phase 5: 后端代码结构优化整理 - Research

**Researched:** 2026-03-15
**Domain:** Python 项目重构 / 依赖管理 / 模块化设计
**Confidence:** HIGH

## Summary

本阶段研究聚焦于后端代码重构的依赖分析、重构顺序规划和安全性保障。通过对现有代码的全面扫描，明确了各层级的导入关系，识别了潜在循环依赖风险，并制定了安全的重构执行计划。

**核心发现:**
1. 当前存在 API 直接调用 Core 的违规情况 (settings.py, media.py)
2. core/config.py 依赖 db 层，存在潜在循环导入风险
3. 重构应遵循 Core → Services → API 的顺序，确保依赖单向流动
4. 重构过程中可通过测试覆盖确保功能完整性

---

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **模块组织方式**: 混合方式 - 业务模块 + 共享层级
- **层级架构**: API → Service → Core 三层架构，禁止 API 直接调用 Core
- **文件命名**: 使用业务相关名称，不使用通用名称如 scraper.py, service.py
- **目标结构**:
  ```
  app/
  ├── api/           # 路由层（按业务拆分）
  ├── services/      # 业务逻辑层
  ├── core/          # 底层实现（共享）
  │   ├── scraper/  # 爬虫模块
  │   ├── archive/  # 解压模块
  │   └── ocr/      # OCR 模块
  ├── db/            # 数据层
  └── main.py
  ```

### Claude's Discretion
- 具体的文件移动和重命名操作顺序
- 是否有需要合并或拆分的现有文件
- 如何处理循环导入问题
- 是否需要添加 __init__.py 导出

### Deferred Ideas (OUT OF SCOPE)
- 前端代码结构优化 - 未来讨论
- TypeScript 类型定义文件(.pyi) - 后续考虑

</user_constraints>

---

## 当前代码结构分析

### 现有目录结构
```
app/
├── api/           # 5 个路由文件
│   ├── media.py   # 直接导入 core.metadata
│   ├── search.py
│   ├── settings.py  # 直接导入 core.config
│   ├── system.py
│   └── tasks.py
├── services/      # 4 个服务文件
│   ├── media_service.py
│   ├── search_service.py
│   ├── task_service.py
│   └── system_service.py
├── core/          # 6 个核心模块文件
│   ├── archive.py    # 独立，无内部依赖
│   ├── config.py     # 依赖 db.models, db.session
│   ├── metadata.py
│   ├── ocr.py        # 独立，无内部依赖
│   ├── scraper.py    # 依赖 core.ocr
│   └── utils.py      # 独立，无内部依赖
├── db/
│   ├── models.py     # 独立，无内部依赖
│   └── session.py    # 独立，无内部依赖
├── mcp/
│   └── server.py     # 依赖 services 和 db
└── main.py
```

---

## 依赖关系分析

### 完整导入关系图

```
┌─────────────────────────────────────────────────────────────────────┐
│                           API Layer                                  │
├─────────────────────────────────────────────────────────────────────┤
│  api/media.py ──────► core.metadata, db.models, db.session,        │
│                            services.media_service                    │
│  api/search.py ──────────────► db.session, services.search_service │
│  api/tasks.py ──────────► db.models, db.session,                  │
│                               services.task_service                 │
│  api/system.py ────────────► db.session, services.system_service  │
│  api/settings.py ──────► core.config, db.models, db.session       │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Service Layer                                 │
├─────────────────────────────────────────────────────────────────────┤
│  services/media_service.py ──► core.archive, core.config,          │
│                                   core.scraper, core.utils,         │
│                                   db.models                         │
│  services/search_service.py ──► core.config, core.scraper,        │
│                                    db.models                        │
│  services/task_service.py ────► core.archive, core.config,        │
│                                    core.scraper, db.models          │
│  services/system_service.py ──► core.config, db.models             │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          Core Layer                                  │
├─────────────────────────────────────────────────────────────────────┤
│  core/scraper.py ──► core.ocr                                         │
│  core/config.py ──► db.models, db.session                           │
│  core/archive.py ─ (无内部依赖)                                      │
│  core/ocr.py ───── (无内部依赖)                                      │
│  core/utils.py ─── (无内部依赖)                                      │
│  core/metadata.py ─ (待检查)                                         │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           DB Layer                                   │
├─────────────────────────────────────────────────────────────────────┤
│  db/models.py ── (无内部依赖)                                        │
│  db/session.py ─ (无内部依赖)                                        │
└─────────────────────────────────────────────────────────────────────┘
```

### 关键问题点

#### 1. API 直接调用 Core (违规)
| 文件 | 问题 | 修复方案 |
|------|------|----------|
| `api/settings.py` | 直接导入 `core.config.ConfigManager` | 通过 Service 层封装 |
| `api/media.py` | 直接导入 `core.metadata` 模块 | 通过 Service 层封装 |

#### 2. 循环依赖风险
```
core/config.py → db/models.py → db/session.py
                 ↑
                 └─ 可能形成循环 (如果 db 导入 core)
```

**风险等级**: LOW - 当前 db 层不依赖 core，但需在重构中保持

---

## 重构顺序规划

### 推荐的执行顺序

**原则**: 依赖单向流动，从底层开始重构，逐步向上

```
Step 1: 重构 Core 层 (底层)
   ├── 将 core/scraper.py → core/scraper/__init__.py, core/scraper/agent.py
   ├── 将 core/archive.py → core/archive/__init__.py
   ├── 将 core/ocr.py → core/ocr/__init__.py
   └── 更新所有 import 路径

Step 2: 创建 Service 封装
   ├── 为 settings 创建 settings_service.py
   ├── 为 metadata 创建 metadata_service.py
   └── 确保 Service 层完整

Step 3: 修改 API 层
   ├── api/settings.py → 使用 settings_service
   ├── api/media.py → 使用 media_service + metadata_service
   └── 移除所有直接 core 导入

Step 4: 清理和优化
   ├── 添加必要的 __init__.py 导出
   └── 验证整体功能
```

### 详细重构步骤

#### Step 1: Core 层重构 (最安全)

**原因**: Core 层依赖最底层 (db)，无循环依赖风险

1. **创建 core/scraper/ 子目录**
   ```
   core/scraper/
   ├── __init__.py      # 导出 ZimukuAgent
   ├── agent.py         # 原 scraper.py 内容
   └── types.py         # 可选：类型定义
   ```

2. **创建 core/archive/ 子目录**
   ```
   core/archive/
   ├── __init__.py      # 导出 ArchiveManager
   └── manager.py       # 原 archive.py 内容
   ```

3. **创建 core/ocr/ 子目录**
   ```
   core/ocr/
   ├── __init__.py      # 导出 SimpleOCREngine
   └── engine.py        # 原 ocr.py 内容
   ```

4. **更新导入路径** (影响范围最小)
   - `services/media_service.py`
   - `services/search_service.py`
   - `services/task_service.py`

#### Step 2: Service 层增强

**原因**: Service 层是 API 和 Core 的桥梁

1. **创建 settings_service.py**
   ```python
   # app/services/settings_service.py
   from ..core.config import ConfigManager
   from ..db.models import Setting
   from ..db.session import get_session

   class SettingsService:
       @staticmethod
       def get_setting(key: str) -> str:
           # 实现
   ```

2. **创建 metadata_service.py** (如果需要)
   ```python
   # app/services/metadata_service.py
   from ..core import metadata as metadata_module

   class MetadataService:
       @staticmethod
       def get_media_info(media_path: str):
           # 实现
   ```

#### Step 3: API 层修复

**原因**: 最后修改 API，确保下层已准备好

1. **修改 api/settings.py**
   ```python
   # Before:
   from ..core.config import ConfigManager

   # After:
   from ..services.settings_service import SettingsService
   ```

2. **修改 api/media.py**
   ```python
   # Before:
   from ..core import metadata as metadata_module

   # After:
   from ..services.metadata_service import MetadataService
   ```

---

## 循环导入解决方案

### 场景分析

| 场景 | 当前状态 | 重构后风险 |
|------|----------|------------|
| core → db | core/config.py 导入 db | LOW - db 不导入 core |
| db → core | 无 | LOW - 保持现状 |
| services ↔ core | 单向流动 | LOW - 保持现状 |

### 防护措施

1. **使用 TYPE_CHECKING 延迟导入**
   ```python
   from typing import TYPE_CHECKING

   if TYPE_CHECKING:
       from .other_module import SomeClass
   ```

2. **使用相对导入而非绝对导入**
   ```python
   # 好的做法
   from ..core.config import ConfigManager

   # 避免
   from app.core.config import ConfigManager
   ```

3. **在 __init__.py 中集中导出**
   ```python
   # core/scraper/__init__.py
   from .agent import ZimukuAgent

   __all__ = ["ZimukuAgent"]
   ```

---

## 功能完整性保障

### 重构前准备

1. **运行现有测试**
   ```bash
   source .venv/bin/activate
   pytest -v
   ```

2. **记录关键端点响应**
   ```bash
   curl http://127.0.0.1:8000/health
   curl http://127.0.0.1:8000/docs
   ```

### 重构中验证

1. **每完成一个模块，运行快速测试**
   ```bash
   # 单元测试
   pytest tests/ -v -x

   # 端到端检查
   curl http://127.0.0.1:8000/health
   ```

2. **使用 Python 导入验证**
   ```bash
   # 验证模块可导入
   python -c "from app.api import media, search, tasks, settings, system"
   python -c "from app.services import media_service, search_service, task_service"
   ```

### 重构后检查

1. **运行完整测试套件**
   ```bash
   pytest --cov=app tests/
   ```

2. **API 功能验证**
   - 各路由可正常响应
   - Service 方法返回正确类型

---

## 风险评估与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 导入路径错误 | 运行时错误 | 逐个模块验证导入 |
| 循环依赖 | 启动失败 | 使用 TYPE_CHECKING |
| 功能回归 | 业务受损 | 完整测试覆盖 |
| 命名冲突 | 难以维护 | 使用业务命名 |

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REQ-01 | 重构后端目录结构 | 依赖分析确认正确分层 |
| REQ-02 | 消除 API 直接调用 Core | 识别问题点，提供 Service 封装方案 |
| REQ-03 | 重命名通用命名文件 | scraper→scraper/, archive→archive/, ocr→ocr/ |
| REQ-04 | 保持功能不变 | 重构顺序保障功能安全 |

---

## Open Questions

1. **metadata.py 的归属**
   - 当前 api/media.py 直接使用
   - 是否需要独立为 core/metadata/ 服务?
   - **建议**: 先保留在 core/，通过 Service 封装调用

2. **utils.py 的处理**
   - 工具函数是否需要拆分为 core/utils/?
   - **建议**: 根据 utils.py 内容判断，当前只有 2 个函数可暂不拆分

3. **config.py 是否需要移动?**
   - 当前 core/config.py 依赖 db
   - **建议**: 保持位置，只需通过 Service 封装对外暴露

---

## Sources

### Primary (HIGH confidence)
- 本地代码分析 - 导入关系扫描
- Python 项目结构最佳实践

### Secondary (MEDIUM confidence)
- Python 循环依赖处理模式

---

## Metadata

**Confidence breakdown:**
- 依赖分析: HIGH - 通过代码扫描获取
- 重构顺序: HIGH - 基于标准软件工程原则
- 循环导入风险: MEDIUM - 已识别风险点
- 功能保障: HIGH - 基于测试驱动重构原则

**Research date:** 2026-03-15
**Valid until:** 90 天 (代码结构重构不频繁变化)
