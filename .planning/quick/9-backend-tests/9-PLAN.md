---
phase: quick
plan: 9
type: execute
wave: 1
depends_on: []
files_modified:
  - tests/test_settings_service.py
  - tests/test_task_service.py
autonomous: true
requirements: []
user_setup: []
must_haves:
  truths:
    - "SettingsService 的 get/set/get_all 方法有测试覆盖"
    - "TaskService 的 CRUD 方法有测试覆盖"
  artifacts:
    - path: "tests/test_settings_service.py"
      provides: "SettingsService 单元测试"
      min_lines: 50
    - path: "tests/test_task_service.py"
      provides: "TaskService CRUD 单元测试"
      min_lines: 100
  key_links:
    - from: "tests/test_settings_service.py"
      to: "app/services/settings_service.py"
      via: "import"
      pattern: "from app.services.settings_service import SettingsService"
    - from: "tests/test_task_service.py"
      to: "app/services/task_service.py"
      via: "import"
      pattern: "from app.services.task_service import TaskService"
---

<objective>
补齐后端服务层单元测试

目的: 为尚未覆盖的 Service 层添加单元测试,提高代码可维护性和回归测试覆盖

输出:
- tests/test_settings_service.py (SettingsService 测试)
- tests/test_task_service.py (TaskService CRUD 测试)
</objective>

<context>
@/home/cy/project/zimuku-subtitle-server/app/services/settings_service.py
@/home/cy/project/zimuku-subtitle-server/app/services/task_service.py
@/home/cy/project/zimuku-subtitle-server/tests/test_db.py
@/home/cy/project/zimuku-subtitle-server/tests/test_media_scan.py
</context>

<tasks>

<task type="auto">
  <name>Task 1: 添加 SettingsService 单元测试</name>
  <files>tests/test_settings_service.py</files>
  <action>
创建 tests/test_settings_service.py,使用内存 SQLite 数据库测试以下场景:
- test_get_setting: 测试获取不存在的 key 返回 None
- test_set_setting_new: 测试创建新设置
- test_set_setting_update: 测试更新已存在的设置
- test_get_all_settings: 测试获取所有设置为 dict

遵循现有测试模式 (参考 test_db.py),使用 @pytest.fixture 创建 session,使用 SQLModel.metadata.create_all
  </action>
  <verify>
<automated>ruff check tests/test_settings_service.py && ruff format --check tests/test_settings_service.py && python -m pytest tests/test_settings_service.py -v</automated>
  </verify>
  <done>SettingsService 的 get_setting, set_setting, get_all_settings 方法都有对应测试用例</done>
</task>

<task type="auto">
  <name>Task 2: 添加 TaskService CRUD 单元测试</name>
  <files>tests/test_task_service.py</files>
  <action>
创建 tests/test_task_service.py,使用内存 SQLite 数据库测试 TaskService 的 CRUD 操作:
- test_create_task: 测试创建任务,验证返回的 task 对象包含正确字段
- test_get_task: 测试通过 ID 获取任务
- test_list_tasks: 测试分页列表查询,支持 status 过滤
- test_delete_task: 测试删除任务 (不删除文件)
- test_delete_task_with_files: 测试删除任务时同时删除关联文件
- test_retry_task: 测试重试失败任务
- test_clear_completed: 测试清理已完成任务

注意: 不需要测试 run_download_task (涉及网络爬虫)
  </action>
  <verify>
<automated>ruff check tests/test_task_service.py && ruff format --check tests/test_task_service.py && python -m pytest tests/test_task_service.py -v</automated>
  </verify>
  <done>TaskService 的 create_task, get_task, list_tasks, delete_task, retry_task, clear_completed 方法都有对应测试用例</done>
</task>

</tasks>

<verification>
- ruff check 通过
- ruff format --check 通过
- pytest 运行全部通过
</verification>

<success_criteria>
- 新增 2 个测试文件,共约 15+ 个测试用例
- 所有测试通过
- 遵循项目代码规范 (ruff check/format)
</success_criteria>

<output>
完成后创建 .planning/quick/9-backend-tests/9-SUMMARY.md
</output>
