# Phase 4: 修复字幕下载定位和移动逻辑 - Context

**Gathered:** 2026-03-15
**Status:** Ready for planning

<domain>
## Phase Boundary

修复字幕下载的目标路径选择和下载后自动移动到正确目录并重命名。包括：搜索结果列表改进、下载弹框样式统一、目标目录选择（电影/剧集列表）、下载后自动移动并重命名。

</domain>

<decisions>
## Implementation Decisions

### 搜索结果布局
- **展示方式**: 卡片式列表，每行一个卡片
- **信息密度**: 中等 - 标题、格式、语言标签、评分、下载数
- **语言展示**: 标签式 - 用带颜色的小标签显示简体/繁体/英文/双语
- **下载按钮**: 悬停显示 - 鼠标悬停时显示下载按钮，界面更干净

### 弹框样式
- **风格**: 白底边框 - 白色背景，浅灰色边框，和页面其他组件风格一致
- **圆角**: rounded-xl (16px)，和现有组件一致
- **遮罩层**: 半透明黑色遮罩 (bg-black/50)

### 目标选择
- **选择方式**: 两级选择 - 先选电影/剧集，再选季和集
- **媒体展示**: 文字列表 - 显示标题 + 年份 + 集数信息，点击展开季/集
- **剧集选择**: 季→集 - 先选季，再选该季的具体集数
- **自定义路径**: 高级选项 - 提供"高级选项"展开手动输入路径

### 下载后移动
- **文件名**: 含语言 - 视频文件名.语言.扩展名 (如 video.简体.ass)
- **移动时机**: 立即移动 - 下载完成后立即移动到目标目录
- **错误处理**: 保留备份 - 移动失败时保留在下载目录，并提示用户

### Claude's Discretion
- 搜索结果卡片的精确布局和间距
- 语言标签的具体颜色方案
- 弹框内的表单组件样式
- 媒体列表的滚动行为
- 后端 API 设计细节

</decisions>

<specifics>
## Specific Ideas

- "搜索结果列表不需要点击展开，直接在列表里显示信息和下载按钮"
- "点击下载后的弹框样式需要修改，不要使用毛玻璃风格，改为和页面整体风格统一的"
- "点击下载后的弹框选择下载目录时，可以选择电影/剧集，有个文字列表展示已经在设置目录导入的电影/剧集，点击剧集还可以选择季/集"
- "如果选择了指定的电影或剧&季&集，点击下载后把字幕移到指定的目录并修改文件名和视频文件名一致"

</specifics>

## Existing Code Insights

### Current Implementation
- SearchPage.tsx: 使用 SearchResultRow 组件，点击展开显示详情
- DownloadModal.tsx: 有 targetPath 状态但未传递给 API
- Modal.tsx: 使用 backdrop-blur-sm 毛玻璃效果
- PathSelector.tsx: 路径输入组件

### Reusable Assets
- TanStack Query: 用于数据获取和缓存
- Zustand: 用于 UI 状态管理
- 现有 Modal 组件: 需要修改样式
- 现有 PathSelector: 作为高级选项备用

### Integration Points
- SearchPage: 需要重构为卡片列表
- DownloadModal: 需要重构目标选择逻辑
- 后端 /tasks API: 需要扩展支持 target_path 参数
- 后端需要新增字幕移动逻辑

</code_context>

<deferred>
## Deferred Ideas

- 批量下载多个字幕 - 未来版本
- 下载历史记录 - 未来版本

</deferred>

---

*Phase: 04-zi-mu-xia-zai-ding-wei-yi-dong*
*Context gathered: 2026-03-15*
