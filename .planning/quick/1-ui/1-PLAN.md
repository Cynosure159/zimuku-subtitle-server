---
phase: quick-ui-feedback
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/src/hooks/useMediaPolling.ts
  - frontend/src/components/MediaConfigPanel.tsx
  - frontend/src/components/MediaList.tsx
  - frontend/src/components/MediaListItem.tsx
autonomous: true
requirements: []
must_haves:
  truths:
    - 点击刷新电影/剧集按钮后立即显示"刷新中..."状态
    - 点击自动搜索按钮后立即显示"搜索中..."状态
  artifacts:
    - path: frontend/src/hooks/useMediaPolling.ts
      provides: 添加乐观更新方法 setIsScanningOptimistic 和 setMatchingFileOptimistic
    - path: frontend/src/components/MediaConfigPanel.tsx
      provides: 点击刷新按钮时立即设置 isScanning=true
    - path: frontend/src/components/MediaList.tsx
      provides: 点击自动搜索时立即将 fileId 添加到 matching_files
---

<objective>
修复UI按钮点击后没有即时反馈的问题 - 添加乐观更新(optimistic update)机制

Purpose: 用户点击按钮时应该立即看到状态变化，而不是等待下一次轮询(2-10秒)
Output: 按钮点击后即时显示加载状态
</objective>

<execution_context>
@/home/cy/.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
当前代码分析:
- useMediaPolling.ts: 轮询机制，每2-10秒更新一次状态
- MediaConfigPanel.tsx: 刷新按钮使用 isScanning 状态，但无乐观更新
- MediaList.tsx: 自动搜索按钮通过 matching_files 判断显示状态，但无乐观更新

问题根因:
1. triggerMediaMatch API调用后，后端更新状态，但前端要等下次轮询才同步
2. autoMatchFile API调用后，同样需要等轮询
3. 用户点击按钮后看到按钮消失或无变化，体验差
</context>

<tasks>

<task type="auto">
  <name>Task 1: 在 useMediaPolling 中添加乐观更新方法</name>
  <files>frontend/src/hooks/useMediaPolling.ts</files>
  <action>
在 useMediaPolling hook 中添加两个乐观更新方法:
1. `setIsScanningOptimistic(value: boolean)` - 立即设置 is_scanning 状态
2. `setMatchingFileOptimistic(fileId: number, isMatching: boolean)` - 立即将 fileId 添加/移除 matching_files 数组

修改返回值: 将这两个方法添加到 return 语句中
  </action>
  <verify>
grep -n "setIsScanningOptimistic\|setMatchingFileOptimistic" frontend/src/hooks/useMediaPolling.ts</verify>
  <done>useMediaPolling 导出两个乐观更新方法</done>
</task>

<task type="auto">
  <name>Task 2: 修复 MediaConfigPanel 刷新按钮即时反馈</name>
  <files>frontend/src/components/MediaConfigPanel.tsx</files>
  <action>
1. 从 useMediaPolling 解构 setIsScanningOptimistic 方法
2. 在 handleMatch 函数中，调用 API 之前先执行 setIsScanningOptimistic(true)
3. 添加 setTimeout 在 3 秒后自动调用 setIsScanningOptimistic(false) 作为兜底恢复

修改 MoviesPage 和 SeriesPage:
- 将 setIsScanningOptimistic 通过 onRefreshData 传递给 MediaConfigPanel
</action>
  <verify>
点击刷新按钮后，按钮文字立即变为"刷新中..."，显示加载动画</verify>
  <done>刷新按钮点击即时显示加载状态</done>
</task>

<task type="auto">
  <name>Task 3: 修复 MediaList 自动搜索按钮即时反馈</name>
  <files>frontend/src/components/MediaList.tsx</files>
  <action>
1. 从 useMediaPolling 解构 setMatchingFileOptimistic 方法
2. 在 handleAutoSearch 函数中，调用 API 之前先执行 setMatchingFileOptimistic(fileId, true)
3. 组件通过 props 接收 setMatchingFileOptimistic 方法

修改 MoviesPage 和 SeriesPage:
- 将 setMatchingFileOptimistic 传递给 MediaList 组件
</action>
  <verify>
点击自动搜索按钮后，立即显示"搜索中"状态（带加载动画）</verify>
  <done>自动搜索按钮点击即时显示搜索中状态</done>
</task>

</tasks>

<verification>
- [ ] 点击刷新电影/剧集按钮后立即显示"刷新中..."
- [ ] 点击自动搜索按钮后立即显示"搜索中"
- [ ] 轮询正常更新状态，不会产生状态冲突
</verification>

<success_criteria>
用户点击按钮后，UI 在 100ms 内显示对应的加载状态</success_criteria>

<output>
After completion, create .planning/quick/1-ui/1-SUMMARY.md
</output>
