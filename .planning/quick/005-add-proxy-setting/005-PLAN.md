# Quick Task 005: 添加代理设置到设置页面

## 问题分析
- 前端 SettingsPage 显示的是数据库 Setting 表中的记录
- ConfigManager 有默认值（base_url, proxy, cache_expiry_hours），但只存在内存中
- 数据库初始化时没有将默认配置项写入 Setting 表，导致前端显示"暂无配置项"

## 解决方案
在 `app/db/session.py` 的 `create_db_and_tables()` 函数中添加默认设置项的初始化逻辑。

## 任务

### Task 1: 修改数据库初始化逻辑，添加默认配置项

**文件**: `app/db/session.py`

**Action**:
1. 在 `create_db_and_tables()` 函数中，创建表后检查 Setting 表是否为空
2. 如果为空，则插入默认配置项（base_url, proxy, cache_expiry_hours）

**Verify**:
- 重启后端服务后，访问设置页面应显示 3 个配置项

**Done**:
- Setting 表中包含默认配置项

