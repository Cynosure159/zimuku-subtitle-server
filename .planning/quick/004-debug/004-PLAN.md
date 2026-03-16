---
phase: quick-004
plan: 1
type: execute
wave: 1
depends_on: []
files_modified: []
autonomous: true
---

<objective>
Debug: "智能补全本季字幕" button点击无作用，后端无debug日志

Purpose: 添加后端调试日志，追踪按钮点击后的API调用链路
Output: 修复按钮功能，添加日志
</objective>

<context>
@frontend/src/pages/SeriesPage.tsx (line 51-64: handleMatchSeason function)
@frontend/src/api.ts (line 95-98: matchTVSeason API function)
@app/api/media.py (line 89-93: /tv/match-season endpoint)
@app/services/media_service.py (line 337-358: run_season_match_process method)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add debug logging to run_season_match_process</name>
  <files>app/services/media_service.py</files>
  <action>
    在 run_season_match_process 方法中添加 debug 级别日志:
    1. 方法开始时记录 title 和 season 参数
    2. 查询文件前记录查询条件
    3. 查询结果为空的处理
    4. 处理每个文件前记录文件名
    5. 方法结束或异常时记录

    使用现有的 logger (已在文件顶部定义):
    - logger.debug(f"开始季匹配: title={title}, season={season}")
    - logger.debug(f"查询到 {len(files)} 个无字幕文件")
  </action>
  <verify>
    <automated>source .venv/bin/activate && ruff check app/services/media_service.py</automated>
  </verify>
  <done>后端日志中可以看到季匹配流程的执行情况</done>
</task>

</tasks>

<verification>
1. 重启后端服务 (uvicorn app.main:app --reload)
2. 点击"智能补全本季字幕"按钮
3. 查看后端日志，应该有 debug 日志输出
</verification>

<success_criteria>
点击按钮后，后端日志显示:
- "开始季匹配: title=xxx, season=N"
- "查询到 X 个无字幕文件"
- 或 "未找到匹配的文件"
</success_criteria>

<output>
After completion, create .planning/quick/004-debug/004-SUMMARY.md
</output>
