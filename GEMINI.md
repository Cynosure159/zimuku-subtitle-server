# Zimuku Subtitle Server

本项目是一个独立的字幕管理与刮削服务，旨在为用户和 AI Agent (通过 MCP) 提供便捷的 [Zimuku (字幕库)](https://www.zimuku.org/) 字幕搜索、下载及管理功能。

## 项目概述

- **目标**: 打造一个中心化的字幕服务，支持多端调用与自动化刮削。
- **核心组件**:
  - **Web UI**: 提供直观的搜索、预览、下载管理和系统配置界面。
  - **RESTful API**: 供第三方工具（如 Bazarr, Jellyfin, Plex）集成调用。
  - **MCP Service**: (Model Context Protocol) 允许 LLM (如 Claude, Gemini) 直接调用工具搜索并获取字幕。

## 技术栈 (建议)

- **后端**: Python (FastAPI) - 理由：生态丰富，对 MCP SDK 支持良好，适合快速开发爬虫与 API。
- **前端**: React (Next.js) 或 Vue (Vite) + Tailwind CSS - 理由：构建现代化、响应式的 Web UI。
- **数据库**: SQLite (初级) 或 PostgreSQL - 理由：存储搜索缓存和配置信息。
- **部署**: Docker / Docker Compose。

## 构建与运行

(待项目结构建立后更新)

## 开发规范

- **环境隔离**: 进行 Python 开发时，**必须**在 `.venv` 虚拟环境中进行，确保依赖库的隔离与一致性。
- **API 优先**: 所有功能应先实现 API，Web UI 和 MCP 均基于 API 构建。
- **文档化**: 必须提供完整的 Swagger/OpenAPI 文档。
- **代理指南**: 
  - 参考 `AGENTS.md` 了解 AI 驱动的开发流程。
  - 关键逻辑需包含详尽的中文注释。
