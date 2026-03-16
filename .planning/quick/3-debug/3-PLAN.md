---
phase: quick
plan: 3
type: execute
wave: 1
depends_on: []
files_modified:
  - app/services/media_service.py
autonomous: true
requirements: []
must_haves:
  truths:
    - 扫描目录时输出详细debug日志
    - 可以通过日志追踪每个文件的处理过程
  artifacts:
    - path: app/services/media_service.py
      provides: 添加debug日志
      min_lines: 10
  key_links:
    - from: run_media_scan_and_match
      to: logger.debug
      via: logging
      pattern: logger.debug
---

<objective>
为扫描目录功能添加debug日志，帮助排查扫描问题。

Purpose: 在扫描媒体文件时输出详细的debug级别日志，方便定位扫描不到文件等问题。
Output: 在 media_service.py 中添加多处 debug 日志
</objective>

<context>
@/home/cy/project/zimuku-subtitle-server/app/services/media_service.py
</context>

<tasks>

<task type="auto">
  <name>Task 1: 添加扫描目录debug日志</name>
  <files>app/services/media_service.py</files>
  <action>
在 run_media_scan_and_match 函数中添加 debug 级别日志：

1. 扫描每个路径前: `logger.debug(f"开始扫描路径: {mp.path}")`
2. 遍历子目录时: `logger.debug(f"处理子目录: {sub_dir}")`
3. 处理每个视频文件前: `logger.debug(f"处理文件: {filename}, title={title}")`
4. 解析文件名结果: `logger.debug(f"解析结果: {parsed}")`
5. 检测字幕结果: `logger.debug(f"字幕检测结果: {has_sub}")`
6. 判断文件是否存在: `logger.debug(f"文件存在检查: {str_path} -> {os.path.exists(str_path)}")`
7. 新增或更新文件记录时: `logger.debug(f"{'新增' if not existing_file else '更新'}文件记录: {filename}")`

注意：已有的 info 级别日志保持不变，只添加 debug 级别。
  </action>
  <verify>
<automated>ruff check app/services/media_service.py</automated>
  </verify>
  <done>在扫描时可以通过设置 logging 级别为 DEBUG 来查看详细日志输出</done>
</task>

</tasks>

<verification>
运行 `ruff check app/services/media_service.py` 无错误即可。
</verification>

<success_criteria>
- 添加了至少 5 处 debug 日志
- ruff check 通过
</success_criteria>

<output>
After completion, create `.planning/quick/3-debug/3-SUMMARY.md`
</output>
