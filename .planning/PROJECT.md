# Zimuku Subtitle Server

## What This Is

自部署字幕管理与刮削服务，支持自动化和手动两种方式获取字幕。通过配置电影和剧集目录，可通过 API 自动触发下载或手动在前端搜索选择字幕。

## Core Value

让用户完全掌控字幕获取流程——既支持下载服务完成后自动触发，也能让 Agent 通过 MCP 调用或用户手动操作获取字幕。

## Requirements

### Validated

（从现有代码推断）

- ✓ 字幕搜索（Zimuku 网站爬虫）
- ✓ 字幕下载（ZIP/7z 解压）
- ✓ 媒体库目录扫描（电影/剧集）
- ✓ 自动匹配字幕
- ✓ 后台任务处理
- ✓ MCP 协议集成
- ✓ React Web UI（基础）

### Active

- [ ] 前端 UI 优化 - 视觉和交互改进
- [ ] 前端 UI 优化 - 视频信息展示增强
- [ ] 手动下载功能 - 搜索结果选择流程
- [ ] 视频信息获取 - 从本地文件读取（nfo/txt）
- [ ] 视频信息获取 - 从本地图片获取海报

### Out of Scope

- 外部 API（TMDB 等）获取视频信息 — 当前仅支持本地文件/图片
- 用户认证系统 — 本地服务不需要
- 视频播放功能 — 仅管理字幕

## Context

**现有代码库：**
- 后端：Python 3.12 + FastAPI + SQLModel + SQLite
- 前端：React 19 + Vite + Tailwind CSS v4 + TypeScript
- 爬虫：Zimuku 网站三层递进匹配策略

**技术债务：**
- 前端 UI 较为基础，交互体验有待提升
- 视频列表缺少详细信息展示
- 手动下载流程尚未实现

## Constraints

- **数据源**: 字幕来源于 zimuku.org 网站
- **视频信息**: 仅从本地文件/图片获取，不调用外部 API
- **部署**: 自部署，不需要云服务

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 使用 Zimuku 网站作为字幕源 | 国内字幕资源丰富 | — Pending |
| 本地文件获取视频信息 | 保护隐私，无需外网 | — Pending |
| MCP 协议集成 | 支持 AI Agent 自动化 | — Pending |

---
*Last updated: 2026-03-13 after initialization*
