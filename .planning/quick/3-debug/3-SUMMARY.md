# Quick Task 3: 扫描目录添加debug日志 - Summary

**Date:** 2026-03-16
**Status:** Completed

## Task Summary

为 `app/services/media_service.py` 的 `run_media_scan_and_match` 函数添加了 debug 级别日志，方便排查扫描问题。

## Changes Made

在 `app/services/media_service.py` 中添加了 9 处 debug 日志：

1. `logger.debug(f"开始扫描路径: {mp.path}")` - 扫描每个路径前
2. `logger.debug(f"路径不存在或不是目录: {mp.path}")` - 路径检查失败时
3. `logger.debug(f"处理子目录: {sub_dir}")` - 遍历子目录时
4. `logger.debug(f"处理文件: {filename}, title={title}")` - 处理每个视频文件前
5. `logger.debug(f"解析结果: {parsed}")` - 解析文件名结果
6. `logger.debug(f"字幕检测结果: has_sub={has_sub}")` - 字幕检测结果
7. `logger.debug(f"文件存在检查: {str_path} -> {os.path.exists(str_path)}")` - 判断文件是否存在
8. `logger.debug(f"新增文件记录: {filename}")` - 新增文件记录时
9. `logger.debug(f"更新文件记录: {filename}")` - 更新文件记录时

## Verification

- `ruff check app/services/media_service.py` - ✅ 通过

## How to Use

在需要查看详细扫描日志时，设置 Python logging 级别为 DEBUG：

```python
import logging
logging.getLogger("app.services.media_service").setLevel(logging.DEBUG)
```

或通过配置环境变量：
```bash
export LOG_LEVEL=DEBUG
```
