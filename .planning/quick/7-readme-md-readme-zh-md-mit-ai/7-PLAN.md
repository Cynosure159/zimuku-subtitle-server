---
phase: quick
plan: 7
type: execute
wave: 1
depends_on: []
files_modified: []
autonomous: true
requirements: []
user_setup: []
---

<objective>
Create README.md and README-zh.md files for the project using community project description style, MIT license, and AI-developed attribution.

Purpose: Document the project for public sharing and open-source distribution.
Output: README.md (English), README-zh.md (Chinese)
</objective>

<execution_context>
@/home/cy/.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@/home/cy/project/zimuku-subtitle-server/CLAUDE.md
@/home/cy/project/zimuku-subtitle-server/API.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create README.md with English documentation</name>
  <files>README.md</files>
  <action>
Create README.md at project root with the following sections:
- Project title: "Zimuku Subtitle Server"
- One-line description: A subtitle management and scraping service with intelligent TV series matching
- Key Features (bullet points):
  - Three-layer matching strategy for precise TV series subtitle matching
  - Automated media library scanning with file detection
  - MCP protocol integration for AI-driven automation
  - Multi-mirror fallback and automatic download
  - Support for both movies and TV series
  - ZIP/7z archive extraction with encoding auto-detection
- Tech Stack: FastAPI, React 19, SQLite/SQLModel, Tailwind CSS v4
- Quick Start: Backend (uvicorn) and Frontend (npm run dev) commands
- API Documentation reference
- MIT License with AI-developed mention
- "Built with Claude" attribution
  </action>
  <verify>
<automated>ls -la /home/cy/project/zimuku-subtitle-server/README.md</automated>
  </verify>
  <done>README.md created with all required sections</done>
</task>

<task type="auto">
  <name>Task 2: Create README-zh.md with Chinese documentation</name>
  <files>README-zh.md</files>
  <action>
Create README-zh.md at project root with Chinese translations:
- Project title: "Zimuku Subtitle Server (字幕库字幕服务)"
- Description in Chinese
- Key Features translated to Chinese:
  - 三层递进匹配策略，精准匹配剧集字幕
  - 自动化媒体库扫描与文件检测
  - MCP 协议集成，支持 AI 驱动自动化
  - 多镜像自动切换与下载
  - 支持电影和剧集
  - ZIP/7z 压缩包自动提取，智能识别编码
- Tech Stack section with Chinese labels
- Quick Start section in Chinese
- MIT License (英文LICENSE内容)
- "借助 Claude 开发" attribution
  </action>
  <verify>
<automated>ls -la /home/cy/project/zimuku-subtitle-server/README-zh.md</automated>
  </verify>
  <done>README-zh.md created with all required sections</done>
</task>

</tasks>

<verification>
[ ] README.md exists at root with English content
[ ] README-zh.md exists at root with Chinese content
[ ] Both files mention MIT License
[ ] Both files mention AI/Claude development attribution
[ ] Project features are accurately described
</verification>

<success_criteria>
Both README files created with:
- Project description and features
- Tech stack information
- Quick start instructions
- MIT License text
- AI development attribution
</success_criteria>

<output>
After completion, the README.md and README-zh.md files will be ready in the project root.
</output>
