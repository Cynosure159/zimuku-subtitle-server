<div align="center">

# 🎬 Zimuku Subtitle Server

**An intelligent subtitle management & scraping service for your media library.**

[![CI](https://github.com/Cynosure159/zimuku-subtitle-server/actions/workflows/ci.yml/badge.svg)](https://github.com/Cynosure159/zimuku-subtitle-server/actions/workflows/ci.yml)
[![Python 3.12](https://img.shields.io/badge/Python-3.12-blue?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

[中文](./README-zh.md) | English

</div>

---

## ✨ Features

| Feature | Description |
|---|---|
| 🎯 **Three-Layer Matching** | Precise TV series subtitle matching through search page → season detail → fallback mode |
| 📂 **Media Library Scanning** | Automatically detect movies & TV series files, filter by subtitle availability |
| 🤖 **MCP Protocol Integration** | Expose search & download as AI-callable tools via [Model Context Protocol](https://modelcontextprotocol.io/) |
| 🔄 **Multi-Mirror Fallback** | Automatically try all available download mirrors for maximum reliability |
| 📦 **Archive Extraction** | ZIP/7z extraction with smart encoding detection (CP437 → GBK) |
| 🎬 **Full Media Support** | Works seamlessly with both movies and TV series |

## 🏗️ Architecture

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

> For detailed architecture documentation, see [ARCH.md](./ARCH.md).

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Backend** | Python 3.12 · FastAPI · SQLModel · SQLite |
| **Frontend** | React 19 · TypeScript · Vite · Tailwind CSS v4 |
| **Infra** | Docker · Docker Compose · GitHub Actions CI |

## 🚀 Quick Start

### Prerequisites

- Python 3.12+
- Node.js 20+
- npm

### Backend

```bash
# Create & activate virtual environment
python -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start development server
uvicorn app.main:app --reload

# Print debug logs (optional)
LOG_LEVEL=DEBUG uvicorn app.main:app --reload
```

- 🌐 API: `http://127.0.0.1:8000`
- 📖 Swagger Docs: `http://127.0.0.1:8000/docs`

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

- 🌐 Frontend: `http://localhost:5173`

## 🐳 Docker Deployment

The easiest way to get started in production:

```bash
# Build and start all services
docker-compose up --build
```

| Service | URL | Description |
|---|---|---|
| Frontend | `http://localhost` | Nginx-served React app |
| Backend | `http://localhost:8000` | FastAPI server |

<details>
<summary>🔧 Run services individually</summary>

```bash
# Backend only
docker-compose build backend
docker-compose up backend

# Frontend only
docker-compose build frontend
docker-compose up frontend
```

</details>

> **Notes:**
> - Backend storage is mounted to `./storage` on the host
> - Backend runs as a non-root user for security
> - Frontend proxies `/api/*` requests to the backend

## 🤖 MCP Integration

Zimuku Subtitle Server exposes its capabilities as AI-callable tools through the [Model Context Protocol](https://modelcontextprotocol.io/):

```bash
# Start the MCP server
python run_mcp.py
```

This allows AI agents to programmatically search for and download subtitles.

## 📖 API Reference

See [API.md](./API.md) for the complete REST API documentation.

**Quick example:**

```bash
# Search for subtitles
curl "http://127.0.0.1:8000/search/?q=Inception"

# Add a media path
curl -X POST "http://127.0.0.1:8000/media/paths?path=/mnt/media/movies&path_type=movie"

# Trigger library scan
curl -X POST "http://127.0.0.1:8000/media/match?path_type=tv"
```

## 🧪 Development

```bash
# Activate virtual environment
source .venv/bin/activate

# Lint & format (required before committing)
ruff check .
ruff format .

# Run tests
pytest

# Run a specific test file
pytest tests/test_scraper.py
```

### CI Pipeline

This project uses [GitHub Actions](https://github.com/Cynosure159/zimuku-subtitle-server/actions/workflows/ci.yml) for continuous integration:

- **Backend**: Ruff lint & format checks → Pytest
- **Frontend**: npm install → Build → ESLint

## 📁 Project Structure

```
zimuku-subtitle-server/
├── app/                    # Backend application
│   ├── api/                #   REST API routes
│   ├── core/               #   Business logic (scraper, archive, OCR)
│   ├── db/                 #   Database models & session
│   ├── mcp/                #   MCP protocol server
│   ├── services/           #   Service layer
│   └── main.py             #   FastAPI entry point
├── frontend/               # React frontend
├── tests/                  # Test suite
├── .github/workflows/      # CI configuration
├── docker-compose.yml      # Docker orchestration
├── Dockerfile              # Backend Docker image
└── requirements.txt        # Python dependencies
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please make sure to run `ruff check .` and `ruff format .` before submitting.

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](./LICENSE) file for details.

---

<div align="center">

Built with ❤️ and Claude

</div>
