---
phase: quick-10
plan: "10"
type: execute
wave: 1
depends_on: []
files_modified:
  - tests/test_search_service.py
  - tests/test_media_service.py
  - tests/test_metadata_service.py
  - tests/test_system_service.py
autonomous: true
requirements: []
must_haves:
  truths:
    - "SearchService 有单元测试覆盖缓存和爬虫调用逻辑"
    - "MediaService 有单元测试覆盖 CRUD 操作"
    - "MetadataService 有单元测试覆盖元数据解析"
    - "SystemService 有单元测试覆盖系统统计"
  artifacts:
    - path: "tests/test_search_service.py"
      provides: "SearchService 缓存和搜索逻辑测试"
    - path: "tests/test_media_service.py"
      provides: "MediaService CRUD 和文件列表测试"
    - path: "tests/test_metadata_service.py"
      provides: "MetadataService 元数据解析测试"
    - path: "tests/test_system_service.py"
      provides: "SystemService 系统统计测试"
---

<objective>
为后端未覆盖单元测试的服务添加单元测试

Purpose: 补充后端测试覆盖率的盲区，确保核心业务逻辑有测试保障
Output: 新增 4 个测试文件，覆盖 SearchService, MediaService, MetadataService, SystemService
</objective>

<context>
@/home/cy/project/zimuku-subtitle-server/app/services/search_service.py
@/home/cy/project/zimuku-subtitle-server/app/services/media_service.py
@/home/cy/project/zimuku-subtitle-server/app/services/metadata_service.py
@/home/cy/project/zimuku-subtitle-server/app/services/system_service.py
@/home/cy/project/zimuku-subtitle-server/tests/test_settings_service.py (参考风格)
@/home/cy/project/zimuku-subtitle-server/tests/test_task_service.py (参考风格)
</context>

<tasks>

<task type="auto">
  <name>Task 1: 添加 SearchService 单元测试</name>
  <files>tests/test_search_service.py</files>
  <action>
1. 创建 tests/test_search_service.py
2. Mock ZimukuAgent 和数据库 Session
3. 测试场景:
   - test_search_returns_cached_results: 缓存命中时直接返回缓存数据
   - test_search_misses_cache_and_calls_agent: 缓存未命中时调用爬虫
   - test_search_updates_cache: 搜索后更新缓存
   - test_search_with_season_episode: 带集数的搜索构建正确的缓存key
4. 使用 pytest.mark.anyio 装饰异步测试
  </action>
  <verify>
    <automated>ruff check tests/test_search_service.py && ruff format tests/test_search_service.py && .venv/bin/python -m pytest tests/test_search_service.py -v</automated>
  </verify>
  <done>SearchService 测试覆盖缓存查询、爬虫调用、缓存更新等核心逻辑</done>
</task>

<task type="auto">
  <name>Task 2: 添加 MediaService 单元测试</name>
  <files>tests/test_media_service.py</files>
  <action>
1. 创建 tests/test_media_service.py
2. Mock 数据库 Session 和文件系统操作
3. 测试场景:
   - test_list_paths: 返回所有媒体路径
   - test_add_path_duplicate: 重复路径抛出 ValueError
   - test_delete_path: 删除路径及其关联的扫描记录
   - test_update_path: 更新路径的 enabled 和 type
   - test_list_files_filtered: 按 type 过滤文件列表
4. 使用 pytest.mark.anyio 装饰异步测试
  </action>
  <verify>
    <automated>ruff check tests/test_media_service.py && ruff format tests/test_media_service.py && .venv/bin/python -m pytest tests/test_media_service.py -v</automated>
  </verify>
  <done>MediaService 测试覆盖 CRUD 操作和文件列表过滤</done>
</task>

<task type="auto">
  <name>Task 3: 添加 MetadataService 和 SystemService 单元测试</name>
  <files>tests/test_metadata_service.py, tests/test_system_service.py</files>
  <action>
1. 创建 tests/test_metadata_service.py
   - 测试 extract_metadata_from_filename: 解析电影/剧集文件名
   - 测试 extract_metadata_from_path: 从路径提取元数据

2. 创建 tests/test_system_service.py
   - 测试 get_system_stats: 返回系统统计信息
   - 测试其他公共方法
  </action>
  <verify>
    <automated>ruff check tests/test_metadata_service.py tests/test_system_service.py && ruff format tests/test_metadata_service.py tests/test_system_service.py && .venv/bin/python -m pytest tests/test_metadata_service.py tests/test_system_service.py -v</automated>
  </verify>
  <done>MetadataService 和 SystemService 测试覆盖元数据提取和系统统计功能</done>
</task>

</tasks>

<verification>
运行完整测试套件确认新增测试通过:
.venv/bin/python -m pytest tests/ -v --tb=short
</verification>

<success_criteria>
- 新增 4 个测试文件
- 每个服务至少 2-3 个测试用例
- ruff check 和 ruff format 通过
- pytest 测试全部通过
</success_criteria>

<output>
After completion, create `.planning/quick/10-backend-tests-coverage/10-SUMMARY.md`
</output>
