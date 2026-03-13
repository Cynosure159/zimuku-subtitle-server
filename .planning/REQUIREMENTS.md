# Requirements: Zimuku Subtitle Server

**Defined:** 2026-03-13
**Core Value:** 让用户完全掌控字幕获取流程——既支持下载服务完成后自动触发，也能让 Agent 通过 MCP 调用或用户手动操作获取字幕。

## v1 Requirements

### Frontend UI 优化

- [x] **UI-01**: 前端界面视觉美化 - 改进配色、间距、字体
- [x] **UI-02**: 交互改进 - 添加过渡动画、hover 效果
- [x] **UI-03**: 响应式设计 - 适配不同屏幕尺寸

### 视频信息展示

- [x] **META-01**: 从 NFO 文件解析视频元数据（标题、年份、剧情、评分）
- [x] **META-02**: 从本地图片获取海报（folder.jpg, poster.jpg, 同名 poster）
- [x] **META-03**: 从 TXT 文件解析视频信息作为回退方案
- [x] **META-04**: 在前端显示视频海报和信息卡片

### 手动下载功能

- [ ] **DOWN-01**: 搜索结果展示改进 - 显示格式、fps、语言等详细信息
- [ ] **DOWN-02**: 搜索结果可展开 - 点击查看字幕详情
- [x] **DOWN-03**: 字幕详情弹窗 - 选择语言、格式
- [x] **DOWN-04**: 下载目标路径选择 - 用户指定保存位置

### 数据层优化

- [x] **DATA-01**: 替换手动轮询为 TanStack Query - 统一数据获取
- [x] **DATA-02**: 添加 UI 状态管理（Zustand）- 侧边栏、主题等

## v2 Requirements

- **ADV-01**: 批量选择和批量下载
- **ADV-02**: 网格/列表视图切换
- **ADV-03**: 下载历史记录

## Out of Scope

| Feature | Reason |
|---------|--------|
| 外部 API（TMDB）获取视频信息 | 用户明确仅支持本地文件/图片 |
| 用户认证系统 | 本地服务不需要 |
| 视频播放功能 | 仅管理字幕 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| UI-01 | Phase 1 | Complete |
| UI-02 | Phase 1 | Complete |
| UI-03 | Phase 1 | Complete |
| META-01 | Phase 1 | Complete |
| META-02 | Phase 1 | Complete |
| META-03 | Phase 1 | Complete |
| META-04 | Phase 1 | Complete |
| DATA-01 | Phase 1 | Complete |
| DATA-02 | Phase 1 | Complete |
| DOWN-01 | Phase 2 | Pending |
| DOWN-02 | Phase 2 | Pending |
| DOWN-03 | Phase 2 | Complete |
| DOWN-04 | Phase 2 | Complete |

**Coverage:**
- v1 requirements: 13 total
- Mapped to phases: 13
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-13*
*Last updated: 2026-03-13 after roadmap creation*
