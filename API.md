# API 参考

基础 URL: `http://127.0.0.1:8000` | Swagger: `/docs`

---

## Media `/media`

| 方法 | 端点 | 说明 | 参数 |
|------|------|------|------|
| GET | `/media/paths` | 获取扫描路径列表 | - |
| POST | `/media/paths` | 添加扫描路径 | `path`, `path_type?` |
| DELETE | `/media/paths/{id}` | 删除扫描路径 | path: `id` |
| PATCH | `/media/paths/{id}` | 更新路径配置 | path: `id`, query: `enabled?`, `path_type?` |
| GET | `/media/files` | 获取扫描的文件列表 | `path_type?` |
| POST | `/media/files/{id}/auto-match` | 单文件自动匹配 | path: `id` |
| POST | `/media/tv/match-season` | 剧集季批量补全 | `title`, `season` |
| POST | `/media/match` | 触发全局扫描 | `path_type?` |
| GET | `/media/task-status` | 获取当前任务状态 | - |

---

## Search `/search`

| 方法 | 端点 | 说明 | 参数 |
|------|------|------|------|
| GET | `/search/` | 搜索字幕(带缓存) | `q` |

---

## Tasks `/tasks`

| 方法 | 端点 | 说明 | 参数 |
|------|------|------|------|
| GET | `/tasks/` | 任务列表(分页) | `offset?`, `limit?`, `status?` |
| POST | `/tasks/` | 创建下载任务 | `title`, `source_url` |
| GET | `/tasks/{id}` | 获取任务状态 | path: `id` |
| DELETE | `/tasks/{id}` | 删除任务 | path: `id`, `delete_files?` |
| POST | `/tasks/{id}/retry` | 重试失败任务 | path: `id` |
| POST | `/tasks/clear-completed` | 清理已完成任务 | - |

---

## Settings `/settings`

| 方法 | 端点 | 说明 | 参数 |
|------|------|------|------|
| GET | `/settings/` | 获取所有配置 | - |
| POST | `/settings/` | 创建/更新配置 | body: `key`, `value`, `description?` |

---

## System `/system`

| 方法 | 端点 | 说明 | 参数 |
|------|------|------|------|
| GET | `/system/stats` | 系统统计 | - |
| GET | `/system/logs` | 获取日志 | `lines?` |

---

## 快速示例

```bash
# 搜索字幕
curl "http://127.0.0.1:8000/search/?q=盗梦空间"

# 添加媒体路径
curl -X POST "http://127.0.0.1:8000/media/paths?path=/mnt/media/movies&path_type=movie"

# 触发扫描
curl -X POST "http://127.0.0.1:8000/media/match?path_type=tv"

# 下载字幕
curl -X POST "http://127.0.0.1:8000/tasks/?title=xxx&source_url=https://www.zimuku.cn/..."

# 查询任务
curl "http://127.0.0.1:8000/tasks/1"
```
