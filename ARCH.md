# 系统架构

## 整体架构

```
┌─────────────────┐     ┌─────────────────┐
│   Web UI        │     │   AI Agent       │
│   (React)       │     │   (MCP)          │
└────────┬────────┘     └────────┬────────┘
         │                        │
         ▼                        ▼
┌─────────────────────────────────────────┐
│           FastAPI Server                │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  │
│  │  API    │  │ Service │  │  Core   │  │
│  │  Layer  │──│  Layer  │──│  Logic  │  │
│  └─────────┘  └─────────┘  └─────────┘  │
└────────────────┬────────────────────────┘
                 │
       ┌─────────┼─────────┐
       ▼         ▼         ▼
   ┌───────┐ ┌───────┐ ┌───────┐
   │SQLite │ │ File  │ │Zimuku │
   │  DB   │ │System │ │  Web  │
   └───────┘ └───────┘ └───────┘
```

## 分层设计

### API Layer (`app/api/`)

| 文件 | 职责 |
|------|------|
| `media.py` | 媒体库管理、扫描、自动匹配 |
| `search.py` | 字幕搜索（带缓存） |
| `tasks.py` | 异步任务管理 |
| `settings.py` | 系统配置 CRUD |
| `system.py` | 系统状态与日志 |

### Service Layer (`app/services/`)

| 服务 | 职责 |
|------|------|
| `media_service.py` | 媒体扫描、路径管理、自动匹配 |
| `task_service.py` | 任务创建、状态管理、后台执行 |
| `search_service.py` | 搜索封装、SQLite 缓存 |
| `system_service.py` | 系统统计、日志获取 |

### Core Layer (`app/core/`)

| 模块 | 职责 |
|------|------|
| `scraper.py` | Zimuku 爬虫，三层匹配策略 |
| `archive.py` | ZIP/7z 解压，编码处理 |
| `ocr.py` | 验证码识别 |
| `config.py` | 配置管理 |
| `utils.py` | 媒体解析、打分算法 |

### Data Layer (`app/db/`)

- SQLModel 模型定义
- 数据库会话管理
- 迁移脚本

## 数据模型

### SubtitleTask

| 字段 | 类型 | 说明 |
|------|------|------|
| id | int | 主键 |
| title | str | 字幕标题 |
| source_url | str | 下载源 URL |
| status | enum | pending/downloading/completed/failed |
| file_path | str | 下载后文件路径 |
| created_at | datetime | 创建时间 |
| updated_at | datetime | 更新时间 |

### MediaPath

| 字段 | 类型 | 说明 |
|------|------|------|
| id | int | 主键 |
| path | str | 扫描路径 |
| path_type | enum | movie / tv |
| enabled | bool | 是否启用 |

### ScannedFile

| 字段 | 类型 | 说明 |
|------|------|------|
| id | int | 主键 |
| media_path_id | int | 外键 MediaPath |
| file_name | str | 文件名 |
| file_path | str | 完整路径 |
| has_subtitle | bool | 是否已有字幕 |

## 核心流程

### 剧集匹配（三层策略）

```
1. 搜索页直接匹配 SxxExx 格式
         ↓
2. 季详情页搜索
         ↓
3. 兜底返回全部结果
         ↓
4. double_filter 二次按集号筛选
         ↓
5. get_sub_score 打分算法选最优
```

### 自动下载

```
提取下载链接 → 轮询镜像 → 下载校验(Magic Bytes) → 解压归档 → 重命名
```

### 任务状态轮询

- 后端：全局 `TaskStatus` 类管理内存状态
- 前端：动态轮询频率（活跃 2s / 空闲 10s）
