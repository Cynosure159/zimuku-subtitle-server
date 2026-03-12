---
title: 重构前端代码结构，合并重复部分作为组件
description: 分析并重构前端代码，消除 MoviesPage 和 SeriesPage 中的重复逻辑，提取公共组件
area: frontend
status: completed
created: 2026-03-12
completed: 2026-03-13
priority: medium
---

## 描述

重构前端代码结构，合并重复部分作为组件

## 已完成

- [x] 分析 MoviesPage 和 SeriesPage 的代码重复情况
- [x] 识别可提取的公共组件
- [x] 提取 MediaList 组件
- [x] 提取 MediaListItem 组件
- [x] 更新 MoviesPage 使用新组件
- [x] 运行 ESLint 确保代码正常

## 提取的组件

### MediaList.tsx
- 通用文件列表渲染
- 处理状态显示（搜索中/已匹配/缺字幕）
- 集成自动搜索和手动搜索按钮

### MediaListItem.tsx
- 单个文件项渲染
- 支持集数显示（E01格式）
- 用于 SeriesPage 的剧集列表

## 说明

大部分组件（MediaConfigPanel、MediaSidebar、MediaInfoCard、EmptySelectionState）已在之前提取。本次新增 MediaList 和 MediaListItem 组件，进一步简化页面代码。
