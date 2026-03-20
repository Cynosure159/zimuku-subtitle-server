<div align="center">

# 🎬 Zimuku Subtitle Server（字幕库字幕服务）

**一款智能的字幕管理与刮削服务，为你的媒体库提供自动化字幕解决方案。**

[![CI](https://github.com/Cynosure159/zimuku-subtitle-server/actions/workflows/ci.yml/badge.svg)](https://github.com/Cynosure159/zimuku-subtitle-server/actions/workflows/ci.yml)
[![Python 3.12](https://img.shields.io/badge/Python-3.12-blue?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

[English](./README.md) | 中文

</div>

---

## ✨ 核心特性

| 特性 | 说明 |
|---|---|
| 🎯 **三层递进匹配** | 通过搜索页 → 季详情页 → 兜底模式，精准匹配剧集字幕 |
| 📂 **自动媒体库扫描** | 自动检测电影和剧集文件，支持按字幕状态筛选 |
| 🤖 **MCP 协议集成** | 通过 [Model Context Protocol](https://modelcontextprotocol.io/) 将功能暴露为 AI 可调用工具 |
| 🔄 **多镜像自动切换** | 自动轮询所有可用下载镜像，确保下载可靠性 |
| 📦 **压缩包自动提取** | 支持 ZIP/7z 解压，智能识别编码（CP437 → GBK） |
| 🎬 **全面媒体支持** | 同时支持电影和剧集 |

## 🏗️ 系统架构

```
┌─────────────────┐     ┌─────────────────┐
│   Web UI        │     │   AI Agent       │
│   (React)       │     │   (MCP)          │
└────────┬────────┘     └────────┬────────┘
         │                       │
         ▼                       ▼
┌─────────────────────────────────────────┐
│           FastAPI Server                │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐ │
│  │  API    │→ │ Service │→ │  Core   │ │
│  │  Layer  │  │  Layer  │  │  Logic  │ │
│  └─────────┘  └─────────┘  └─────────┘ │
└────────────────┬────────────────────────┘
                 │
       ┌─────────┼─────────┐
       ▼         ▼         ▼
   ┌───────┐ ┌───────┐ ┌───────┐
   │SQLite │ │ File  │ │Zimuku │
   │  DB   │ │System │ │  Web  │
   └───────┘ └───────┘ └───────┘
```

> 详细架构文档请参阅 [ARCH.md](./ARCH.md)。

## 🛠️ 技术栈

| 层级 | 技术 |
|---|---|
| **后端** | Python 3.12 · FastAPI · SQLModel · SQLite |
| **前端** | React 19 · TypeScript · Vite · Tailwind CSS v4 |
| **基础设施** | Docker · Docker Compose · GitHub Actions CI |

## 🚀 快速开始

### 环境要求

- Python 3.12+
- Node.js 20+
- npm

### 后端

```bash
# 创建并激活虚拟环境
python -m venv .venv
source .venv/bin/activate

# 安装依赖
pip install -r requirements.txt

# 启动开发服务器
uvicorn app.main:app --reload
```

- 🌐 API 地址：`http://127.0.0.1:8000`
- 📖 Swagger 文档：`http://127.0.0.1:8000/docs`

### 前端

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

- 🌐 前端地址：`http://localhost:5173`

## 🐳 Docker 部署

生产环境推荐使用 Docker 一键部署：

```bash
# 构建并启动所有服务
docker-compose up --build
```

| 服务 | 地址 | 说明 |
|---|---|---|
| 前端 | `http://localhost` | Nginx 托管的 React 应用 |
| 后端 | `http://localhost:8000` | FastAPI 服务 |

<details>
<summary>🔧 单独运行服务</summary>

```bash
# 仅后端
docker-compose build backend
docker-compose up backend

# 仅前端
docker-compose build frontend
docker-compose up frontend
```

</details>

> **注意事项：**
> - 后端存储挂载到宿主机的 `./storage` 目录
> - 后端以非 root 用户运行，确保安全性
> - 前端将 `/api/*` 请求代理到后端

## 🤖 MCP 集成

Zimuku Subtitle Server 通过 [Model Context Protocol](https://modelcontextprotocol.io/) 将其功能暴露为 AI 可调用的工具：

```bash
# 启动 MCP 服务器
python run_mcp.py
```

这使得 AI 代理可以通过编程方式搜索和下载字幕，实现自动化字幕管理。

## 📖 API 文档

完整的 REST API 文档请参阅 [API.md](./API.md)。

**快速示例：**

```bash
# 搜索字幕
curl "http://127.0.0.1:8000/search/?q=盗梦空间"

# 添加媒体路径
curl -X POST "http://127.0.0.1:8000/media/paths?path=/mnt/media/movies&path_type=movie"

# 触发库扫描
curl -X POST "http://127.0.0.1:8000/media/match?path_type=tv"
```

## 🧪 开发指南

```bash
# 激活虚拟环境
source .venv/bin/activate

# 代码检查与格式化（提交前必须执行）
ruff check .
ruff format .

# 运行测试
pytest

# 运行单个测试文件
pytest tests/test_scraper.py
```

### CI 流水线

项目使用 [GitHub Actions](https://github.com/Cynosure159/zimuku-subtitle-server/actions/workflows/ci.yml) 进行持续集成：

- **后端**：Ruff 代码检查与格式化 → Pytest 单元测试
- **前端**：npm 安装依赖 → 构建 → ESLint 检查

## 📁 项目结构

```
zimuku-subtitle-server/
├── app/                    # 后端应用
│   ├── api/                #   REST API 路由
│   ├── core/               #   核心业务逻辑（爬虫、解压、OCR）
│   ├── db/                 #   数据库模型与会话管理
│   ├── mcp/                #   MCP 协议服务器
│   ├── services/           #   Service 服务层
│   └── main.py             #   FastAPI 应用入口
├── frontend/               # React 前端
├── tests/                  # 测试套件
├── .github/workflows/      # CI 配置
├── docker-compose.yml      # Docker 编排
├── Dockerfile              # 后端 Docker 镜像
└── requirements.txt        # Python 依赖
```

## 🤝 参与贡献

欢迎贡献！请随时提交 Pull Request。

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送分支 (`git push origin feature/amazing-feature`)
5. 发起 Pull Request

提交前请确保执行 `ruff check .` 和 `ruff format .`。

## 📄 许可证

本项目基于 MIT 许可证开源 — 详情请查看 [LICENSE](./LICENSE) 文件。

---

<div align="center">

借助 ❤️ 和 Claude 开发

</div>
