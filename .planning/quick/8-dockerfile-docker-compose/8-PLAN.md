---
phase: quick-8-dockerfile-docker-compose
plan: 1
type: execute
wave: 1
depends_on: []
files_modified: []
autonomous: true
requirements: []
---

<objective>
Create Docker configurations for the project with multi-stage builds to minimize image size.

Purpose: Enable containerized deployment with optimized image sizes for both frontend and backend.
Output: Dockerfile for backend, Dockerfile for frontend, docker-compose.yml
</objective>

<execution_context>
@/home/cy/.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
Project uses:
- Backend: Python 3.12, FastAPI, runs on uvicorn (app/main.py)
- Frontend: Vite 7.3.1 + React 19, builds to static files
- Python dependencies in requirements.txt
- Node dependencies in frontend/package.json
- Python uses .venv virtual environment
</context>

<tasks>

<task type="auto">
  <name>Create backend Dockerfile with multi-stage build</name>
  <files>Dockerfile</files>
  <action>
Create Dockerfile for backend with multi-stage build:
1. Base stage: Python 3.12-slim
2. Install dependencies from requirements.txt (use --no-cache-dir)
3. Copy application code (app/, storage/, pyproject.toml, requirements.txt, run_mcp.py)
4. Create non-root user for security
5. Expose port 8000
6. Set CMD to run uvicorn

Use slim base image for minimal size. Do not include .venv in image - install deps system-wide with --no-cache-dir.
  </action>
  <verify>
Dockerfile exists at project root with valid syntax
  </verify>
  <done>Dockerfile created with Python 3.12-slim base, multi-stage build, non-root user</done>
</task>

<task type="auto">
  <name>Create frontend Dockerfile with multi-stage build</name>
  <files>frontend/Dockerfile</files>
  <action>
Create Dockerfile for frontend with multi-stage build:
1. Build stage: Node 22-alpine
2. Copy package.json and package-lock.json
3. Install dependencies (use npm ci --legacy-peer-deps)
4. Copy source code and build
5. Production stage: Nginx alpine for serving static files
6. Copy build output from build stage
7. Expose port 80

Use nginx:alpine for minimal production image.
  </action>
  <verify>
frontend/Dockerfile exists with valid syntax
  </verify>
  <done>Frontend Dockerfile created with Node build stage and nginx:alpine production stage</done>
</task>

<task type="auto">
  <name>Create docker-compose.yml for orchestration</name>
  <files>docker-compose.yml</files>
  <action>
Create docker-compose.yml:
1. Services: backend, frontend
2. Backend service:
   - Build from Dockerfile (project root)
   - Container name: zimuku-backend
   - Ports: 8000:8000
   - Volumes: ./storage:/app/storage (for subtitle files)
   - Environment: PYTHONUNBUFFERED=1
3. Frontend service:
   - Build from frontend/Dockerfile
   - Container name: zimuku-frontend
   - Ports: 80:80
   - Depends on: backend
4. Add healthcheck for backend

Use version "3.8" for compose file format.
  </action>
  <verify>
docker-compose.yml exists with valid syntax
  </verify>
  <done>docker-compose.yml created with backend and frontend services, volume mounts, port mappings</done>
</task>

</tasks>

<verification>
- All 3 files exist (Dockerfile, frontend/Dockerfile, docker-compose.yml)
- docker-compose config validates without errors
</verification>

<success_criteria>
- Backend Dockerfile builds successfully
- Frontend Dockerfile builds successfully
- docker-compose up --build runs both services
</success_criteria>

<output>
After completion, create .planning/quick/8-dockerfile-docker-compose/8-SUMMARY.md
</output>
