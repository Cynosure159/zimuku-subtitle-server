# Zimuku Subtitle Server - UI/UX Design System

## 1. 设计概述与核心理念
本项目的前端 UI 采用了 **"The Digital Curator"（数字策展人）** 的设计理念，旨在打造一个极具高端感、沉浸感且充满呼吸感的现代化媒体管理服务。

核心视觉特征包括：
- **深空石板色调 (Deep Slate)**：以极致深邃的暗蓝色 (`#060e20`) 作为背景基调，摆脱传统的纯黑或呆板的深灰。
- **毛玻璃与层次感 (Glassmorphism & Depth)**：放弃生硬的 1px 全局边框，采用不同明暗度的 Surface 层级（低亮、中亮、高亮）叠加，结合 Backdrop Blur 表现空间深度。
- **微交互与律动感 (Micro-animations)**：大量的平滑过渡（如 `transition-all duration-300 hover:-translate-y-1`），让界面如同活物般响应用户的每一次悬停与点击。

## 2. 色彩与表面 (Colors & Surfaces)

### 2.1 表面层级架构 (Surface Hierarchy)
在代码中，我们通过 Tailwind CSS 自定义变量或类名来构建层级关系：
- **`bg-background` (`#060e20`)**：页面最底层的深空色，奠定整体氛围。
- **`bg-surface-container-low`**：承载核心主内容区（例如电影详情右侧区域）的容器底色。
- **`bg-surface-container`**：通用卡片、列表项的默认背景色。
- **`bg-surface-container-high` / `bg-surface-container-highest`**：用于悬停态（Hover）以拉近视觉距离，提升元素优先级。

### 2.2 重心渐变与点缀 (Accents & Gradients)
- **Primary (紫蓝色调)**：作为主强调色，应用于选中状态、主要按钮和电影状态强调。
  - *常见用法*：利用 `bg-gradient-to-br from-primary to-primary-container` 制作带有“辉光”效果的图标底座或进度条。
- **Tertiary (紫色调)**：作为次强调色（例如在仪表盘中用于区分“剧集”与“电影”），打破单调感。
- **Status (状态色)**：使用 `error-dim` 作为告警或醒目的状态色（如无字幕提示）。

### 2.3 边框原则 (The "Ghost Border" Rule)
绝不使用生硬的高对比度边框。模块划分主要依靠面与面的明暗对比。当必须使用边框辅助视障或边界界定时，使用“幽灵边框”：
- *代码示例*：`border border-outline-variant/5` 或 `border border-outline-variant/10`。

## 3. 排版规范 (Typography)

利用两套字体族构建编辑式的排版层次（已在 Tailwind 配置中注册）：
- **`font-headline` (Manrope)**：用于展现品牌感和权威感。常与 `font-extrabold` 或 `font-bold` 结合，例如页面级标题 (`text-4xl`) 或主卡片标题 (`text-xl`)。
- **`font-body` (Inter)**：用于标准的正文、描述与详情文本区。
- **`font-label` (Inter)**：用于状态标签、副标题、小数据。
  - *标志性用法*：采用全大写配合宽字间距（`uppercase tracking-widest text-xs` 或 `text-[10px]`）来呈现系统标签级的信息，如 `SUBTITLE SERVER`。字体颜色多配以 `text-on-surface-variant`。

## 4. 关键组件结构与样式 (Component Patterns)

### 4.1 响应式侧边栏 (Media Sidebar)
- **视觉**：固定在左侧，悬浮设计（四边留白）。背景使用 `bg-[#060e20]/70 backdrop-blur-xl shadow-[0_0_40px_rgba(138,149,255,0.06)]`，使其脱离底层内容。
- **交互**：收起时仅展示 Icon，悬停展开（`hover:w-64 transition-all duration-500`）。在移动端/窄屏侧边隐藏，通过底部悬浮的主色调按钮（Fab Button）进行触发。
- **Logo 区域**：利用方形渐变底块配合 Material 实体图标 (`fontVariationSettings: "'FILL' 1"`)。

### 4.2 卡片与列表项 (Cards & List Items)
- **圆角规范**：页面级大容器使用 `rounded-2xl`，内部小卡片或按钮使用 `rounded-xl` 或 `rounded-lg`。
- **胶囊标签 (Badges)**：用于展示有无字幕等状态。
  - *带有明确指向性的标签*：`px-1.5 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase bg-primary/10 text-primary border border-primary/20`
  - *无字幕/警告标签*：`bg-error-dim/10 text-error-dim border border-error-dim/20`
- **悬停浮动卡片**：在仪表盘和最近添加列表中广泛应用的交互范式：`group p-4 rounded-2xl bg-surface-container border border-outline-variant/5 cursor-pointer hover:bg-surface-container-highest hover:-translate-y-1 transition-all duration-300`。右侧箭头搭配 `group-hover:text-primary group-hover:translate-x-1` 提供明确指示。

### 4.3 图标与状态机 (Icons)
本项目统一采用 Google Material Symbols (`material-symbols-outlined`)。
- 默认线框风格。
- **高亮/激活状态**：直接通过内联样式赋实心表现（`style={{ fontVariationSettings: "'FILL' 1" }}`）。
- 图标如果处于未激活或普通信息展示中，通常赋予 `text-on-surface-variant`，在强调区域或图元展示中辅以 `bg-surface-container-low` 构成图标座块。

### 4.4 数据条与进度 (Progress & Stats)
- 对于容量占比或完成进度，采用 `h-1.5` 等细长型的进度条，外壳 `bg-surface-container-high` 加上内部渐变填充区 `bg-gradient-to-r from-primary to-primary-container`。
- 数字字体统一使用 `font-headline font-extrabold`（如仪表盘的大数字 `text-5xl`）。

## 5. 开发建议 (Do's and Don'ts)

- **推荐 (DO)**：使用 `gap-4`, `gap-6` 和充足的 `padding` 撑起页面内容，避免界面紧凑拥挤。
- **推荐 (DO)**：对主要图片（如海报）添加蒙层或渐变以配合深色模式背景（避免突兀的高亮）。
- **禁止 (DON'T)**：不要使用大面积的实色黑（`bg-black`）或高纯度亮色。使用我们已规划好的 `surface` 系统或带透明度的基础色（例：`bg-primary/10`）。
- **禁止 (DON'T)**：不要直接绘制实体分割线。使用 `border-b border-outline-variant/10` 级别的幽灵线缝。
