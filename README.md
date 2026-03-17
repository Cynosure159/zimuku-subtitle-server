# Zimuku Subtitle Server

[中文](./README-zh.md) | English

A subtitle management and scraping service with intelligent TV series matching, supporting automated media library scanning and AI-driven automation via MCP protocol.

## Key Features

- **Three-layer Matching Strategy**: Precise TV series subtitle matching through search page → season detail → fallback mode
- **Automated Media Library Scanning**: Detect movies and TV series files, support filtering by subtitle presence
- **MCP Protocol Integration**: Expose search and download functions as AI-callable tools for automation
- **Multi-mirror Fallback**: Automatically try all available download mirrors with reliability
- **Comprehensive Support**: Works with both movies and TV series
- **Archive Extraction**: Automatic ZIP/7z archive extraction with encoding auto-detection (CP437 → GBK)

## Tech Stack

- **Backend**: FastAPI + Python
- **Database**: SQLite + SQLModel
- **Frontend**: React 19 + Vite + Tailwind CSS v4 + TypeScript

## Quick Start

### Backend

```bash
# Activate virtual environment
source .venv/bin/activate

# Run development server
uvicorn app.main:app --reload
```

The API will be available at `http://127.0.0.1:8000`
Swagger documentation: `http://127.0.0.1:8000/docs`

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

The frontend will be available at `http://localhost:5173`

## Docker Deployment

### Build and Run

```bash
docker-compose up --build
```

### Services

- **Frontend**: http://localhost (nginx)
- **Backend**: http://localhost:8000

### Development

```bash
# Backend only
docker-compose build backend
docker-compose up backend

# Frontend only
docker-compose build frontend
docker-compose up frontend
```

### Notes

- Backend storage is mounted to `./storage` on host
- Backend runs as non-root user for security
- Frontend proxies `/api/*` requests to backend

## API Documentation

See [API.md](./API.md) for complete API reference.

## License

MIT License

Copyright (c) 2024

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---

Built with Claude
