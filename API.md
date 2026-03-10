# Zimuku Subtitle Server - API 文档

本文档基于 `app/api` 目录下的路由自动生成，描述了后端暴露的所有 RESTful API 接口。

基础 URL: `http://127.0.0.1:8000`  
Swagger UI 交互式文档: `http://127.0.0.1:8000/docs`

---

## 1. 媒体库管理 (Media)
**路径前缀:** `/media`

### `GET /media/paths`
获取所有已配置的媒体库扫描路径。
- **参数:** 无
- **响应:** `List[MediaPath]` (JSON 数组)

### `POST /media/paths`
添加新的媒体库扫描路径。
- **查询参数 (Query):**
  - `path` (str, 必填): 扫描目录的绝对路径
  - `path_type` (str, 选填, 默认 `movie`): 路径类型，可选值为 `movie` 或 `tv`
- **响应:** 成功返回创建的 `MediaPath` 对象。如路径已存在则返回 `400 Bad Request`。

### `DELETE /media/paths/{path_id}`
删除指定的媒体库扫描路径。关联的扫描文件记录也会被一并删除。
- **路径参数 (Path):**
  - `path_id` (int, 必填): 路径的 ID
- **响应:** `{"status": "ok", "message": "Path {path_id} deleted"}`

### `PATCH /media/paths/{path_id}`
更新指定的媒体库扫描路径配置。
- **路径参数 (Path):**
  - `path_id` (int, 必填): 路径的 ID
- **查询参数 (Query):**
  - `enabled` (bool, 选填): 是否启用该路径的扫描
  - `path_type` (str, 选填): 更新路径类型 (`movie`|`tv`)
- **响应:** 更新后的 `MediaPath` 对象。

### `GET /media/files`
获取已扫描入库的本地媒体视频文件列表（按时间倒序排列）。
- **查询参数 (Query):**
  - `path_type` (str, 选填): 按类型过滤，可选值为 `movie` 或 `tv`
- **响应:** `List[ScannedFile]` (JSON 数组)

### `POST /media/files/{file_id}/auto-match`
针对单个特定的视频文件执行全自动的搜索、下载、解压、匹配与归档流程。
- **路径参数 (Path):**
  - `file_id` (int, 必填): 扫描到的媒体文件 ID
- **响应:** `{"status": "ok", "message": "Full auto-match process started in background"}`

### `POST /media/tv/match-season`
针对特定剧集的特定季，批量执行所有缺失字幕视频文件的自动化补全任务。系统会以安全间隔逐集运行匹配逻辑。
- **查询参数 (Query):**
  - `title` (str, 必填): 剧集名称
  - `season` (int, 必填): 季号
- **响应:** `{"status": "ok", "message": "Matching process for '{title}' Season {season} started in background"}`

### `POST /media/match`
手动触发全局媒体库扫描与关联任务。
- **查询参数 (Query):**
  - `path_type` (str, 选填): 按类型触发 (`movie`|`tv`)
- **响应:** `{"status": "ok", "message": "Media scan and match task started in background"}`

---

## 2. 字幕搜索 (Search)
**路径前缀:** `/search`

### `GET /search/`
根据关键字搜索字幕。包含防封禁的数据库缓存逻辑（默认缓存24小时）。
- **查询参数 (Query):**
  - `q` (str, 必填): 搜索的关键字 (如电影名)
- **响应:** JSON 数组，包含提取到的字幕信息 (标题、格式、大小、下载链接等)。

---

## 3. 任务管理 (Tasks)
**路径前缀:** `/tasks`

### `GET /tasks/`
分页列出所有的字幕下载与处理任务。
- **查询参数 (Query):**
  - `offset` (int, 选填, 默认 0): 分页偏移量
  - `limit` (int, 选填, 默认 10): 返回数量限制 (最大 100)
  - `status` (str, 选填): 按状态过滤任务 (`pending`, `downloading`, `completed`, `failed`)
- **响应:** `{"total": 10, "offset": 0, "limit": 10, "items": [...]}`

### `POST /tasks/`
基于从搜索接口获取的 `source_url` 创建一个新的字幕下载任务，后台将自动进行下载与解压。
- **查询参数 (Query):**
  - `title` (str, 必填): 任务名称/字幕名称
  - `source_url` (str, 必填): 对应字幕的 Zimuku 详情页 URL
- **响应:** 返回新建的 `SubtitleTask` 对象。

### `GET /tasks/{task_id}`
查询指定任务的状态。
- **路径参数 (Path):**
  - `task_id` (int, 必填): 任务的 ID
- **响应:** `SubtitleTask` 对象。

### `DELETE /tasks/{task_id}`
删除任务记录。
- **路径参数 (Path):**
  - `task_id` (int, 必填): 任务的 ID
- **查询参数 (Query):**
  - `delete_files` (bool, 选填, 默认 false): 是否同时删除磁盘上已下载的关联字幕文件
- **响应:** `{"status": "ok", "message": "Task {task_id} deleted"}`

### `POST /tasks/{task_id}/retry`
重试处于 `failed` (失败) 状态的下载任务。
- **路径参数 (Path):**
  - `task_id` (int, 必填): 任务的 ID
- **响应:** 状态更新为 `pending` 的 `SubtitleTask` 对象。

### `POST /tasks/clear-completed`
一键清理所有状态为 `completed` 的任务记录。
- **参数:** 无
- **响应:** `{"status": "ok", "cleared_count": 5}`

---

## 4. 系统设置 (Settings)
**路径前缀:** `/settings`

### `GET /settings/`
获取所有系统配置的键值对。
- **参数:** 无
- **响应:** `List[Setting]`

### `POST /settings/`
创建或更新系统配置。
- **请求体 (Body - JSON):**
  - `key` (str, 必填): 配置键名 (例如 `storage_path`, `proxy_url`)
  - `value` (str, 必填): 配置项对应的值
  - `description` (str, 选填): 该配置的文字说明
- **响应:** 更新或创建的 `Setting` 对象。

---

## 5. 系统状态 (System)
**路径前缀:** `/system`

### `GET /system/stats`
获取系统宏观的统计信息。
- **参数:** 无
- **响应:** 
  ```json
  {
    "tasks": {
      "total": 10,
      "completed": 5,
      "failed": 1,
      "pending": 4
    },
    "cache": {
      "total_entries": 120
    },
    "storage": {
      "path": "storage/downloads",
      "total_size_mb": 15.5,
      "free_space_gb": 120.4
    }
  }
  ```

### `GET /system/logs`
获取后端系统最近的运行日志（注：需要配置日志文件写入到 `app.log` 方可生效）。
- **查询参数 (Query):**
  - `lines` (int, 选填, 默认 100): 要返回的最近日志行数
- **响应:** 日志字符串列表。