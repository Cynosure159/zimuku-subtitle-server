---
phase: quick-series-file-list-style
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/src/pages/SeriesPage.tsx
autonomous: true
requirements: []
must_haves:
  truths:
    - 剧集文件列表样式美观、整洁、层次分明
    - 集数、文件名、状态、操作按钮布局合理
  artifacts:
    - path: frontend/src/pages/SeriesPage.tsx
      provides: 文件列表组件样式优化
---

<objective>
修复剧集管理页面文件列表样式

Purpose: 提升文件列表的视觉效果和用户体验，使布局更清晰、合理
Output: 优化后的文件列表组件
</objective>

<execution_context>
@/home/cy/.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
当前文件列表样式问题:
1. 文件行之间的分隔不够明显
2. 集数编号与文件名之间的间距不够协调
3. 状态标签和操作按钮的排列可以更紧凑
4. 整体视觉层次不够分明

参考 MoviesPage 的样式设计进行统一
</context>

<tasks>

<task type="auto">
  <name>Task 1: 优化剧集文件列表样式</name>
  <files>frontend/src/pages/SeriesPage.tsx</files>
  <action>
优化文件列表组件样式 (SeriesPage.tsx 第 236-292 行):

1. 改进表头样式:
   - 增加背景色饱和度，使用 slate-100
   - 增加文字大小到 text-xs

2. 改进文件行样式:
   - 添加 hover 背景色 (hover:bg-slate-50)
   - 改善行内间距
   - 集数编号使用更醒目的样式 (圆形或徽章样式)
   - 文件名使用更清晰的字重

3. 改进状态标签:
   - 使用更柔和的颜色方案
   - 添加轻微的圆角和阴影

4. 改进操作按钮:
   - 调整按钮间距
   - 优化按钮内部间距

整体目标: 创造更清晰、更专业的视觉效果
  </action>
  <verify>
npm run lint -- --fix frontend/src/pages/SeriesPage.tsx</verify>
<done>文件列表样式美观、布局合理、层次分明</done>
</task>

</tasks>

<verification>
- [ ] 文件列表表头样式清晰
- [ ] 文件行 hover 状态有视觉反馈
- [ ] 集数编号样式醒目
- [ ] 状态标签和操作按钮排列整齐
- [ ] 代码通过 lint 检查
</verification>

<success_criteria>
文件列表视觉效果显著提升，用户可以快速识别集数、文件名、状态和操作</success_criteria>

<output>
After completion, create .planning/quick/004/004-SUMMARY.md
</output>
