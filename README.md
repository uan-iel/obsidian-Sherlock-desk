# Sherlock OS

一款受夏洛克·福尔摩斯启发的 Obsidian 插件，以「本地优先、案卷化组织」为核心，把案件、任务、排期、研读、证物和足迹整合进一张可交互的 221B 工作台。

---

## 功能总览

Sherlock OS 不依赖外部数据库，所有数据都是 Vault 里的普通 Markdown 文件。它通过 frontmatter 中的 `type` 字段识别六种实体：

| 实体 | 对应文件夹 | 作用 |
|------|-----------|------|
| `case` | `Sherlock OS/Cases` | 案件/项目卷宗，可追踪状态、优先级、截止时间 |
| `task` | `Sherlock OS/Tasks` | 案件线索任务，可关联到具体案件 |
| `schedule` | `Sherlock OS/Schedules` | 调查排期，可拖拽安排到周视图 |
| `collection` | `Sherlock OS/Collections` | 正在研读的内容（书、电影、文章等） |
| `evidence` | `Sherlock OS/Evidence` | 沉淀后的证物/资料，可关联案件 |
| `place` | `Sherlock OS/Places` | 足迹/地点，通过地图点击创建并自动记录经纬度 |

### 主界面

1. **Entry 入口屏**：点击中央卷宗进入主控制台。
2. **Home 主页**：展示三大工作入口——Project Desk、Archive Desk、Memory Map。
3. **Project Desk（案件桌）**：看板形式管理案件，右侧周排期支持拖拽任务、调整时长、顺延冲突。
4. **Archive Desk（档案桌）**：管理「证物研读」和已归档的「证物柜」，支持一键将研读转为证物。
5. **Memory Map（足迹地图）**：在复古地图上点击任意位置创建足迹，自动生成可点击的小勾。
6. **Case Workspace（案件工作区）**：单个案件的详情页，聚合案情中枢、线索任务、调查排期、证物柜和时间线。

### 核心命令

插件注册了一系列 Obsidian 命令：

- Open Sherlock workspace
- Create a new case file
- Create a new task file
- Create a task for the current case
- Create evidence for the current case
- Create a new schedule file
- Create a new collection item
- Create a new footprint place

同时左侧 Ribbon 提供「Open Sherlock」图标按钮。

---

## 技术架构

### 文件结构

```
.
├── src/
│   ├── main.ts          # 插件主类：生命周期、命令、文件操作、排期逻辑
│   ├── view.ts          # 自定义 ItemView：所有 UI 渲染与交互
│   ├── data.ts          # 数据层：模板、文件夹初始化、Vault 数据扫描
│   ├── settings.ts      # 设置面板
│   ├── types.ts         # TypeScript 类型定义
│   └── electron-shim.d.ts  # electron shell 类型声明
├── assets/              # 插件内置图片（入口、客厅、世界地图）
├── styles.css           # 全局样式 + 视图样式
├── main.js              # esbuild 打包产物（提交到仓库）
├── manifest.json        # Obsidian 插件清单
├── esbuild.config.mjs   # 构建配置
├── tsconfig.json        # TypeScript 配置
└── package.json
```

### 数据流

1. **创建**：用户通过命令或视图按钮触发 `SherlockOSPlugin.createXxxNote()`。
2. **模板**：`data.ts` 中的 `buildXxxTemplate()` 生成带标准 frontmatter 的 Markdown 内容。
3. **存储**：文件按类型写入 `Sherlock OS/` 下对应子文件夹。
4. **扫描**：`collectWorkspaceData()` 遍历所有 Markdown 文件，根据 `type` 解析成结构化数据。
5. **渲染**：`SherlockWorkspaceView` 拿到数据后重新渲染当前屏幕。
6. **交互**：足迹地图通过点击位置百分比与 `convertMapPercentToCoordinates()` 的逆投影自洽定位，保证小勾出现在用户点击处。
7. **刷新**：Vault 的 `create`/`modify`/`delete` 事件会自动触发视图刷新。

### 关键设计

- **无外部依赖**：除 Obsidian API 和 esbuild 外无运行时依赖。
- **frontmatter 驱动**：所有实体识别、关联、状态都通过 frontmatter 完成，普通 Markdown 编辑器也能正常读写。
- **响应式 UI**：CSS 在 `980px` 和 `1200px` 断点做适配，并支持 `prefers-reduced-motion`。
- **昼夜主题**：根据当前时间自动切换 `day`/`night` 两套氛围变量。
- **调试日志**：运行期问题会写入 `/tmp/sherlock-os-debug.log`。

---

## 安装

### 手动安装

1. 下载本仓库到 Obsidian Vault 的 `.obsidian/plugins/` 目录下，文件夹命名为 `sherlock-os`。
2. 确保目录包含 `manifest.json`、`main.js`、`styles.css` 和 `assets/`。
3. 在 Obsidian 设置 → 社区插件中启用 **Sherlock OS**。

### 开发构建

```bash
npm install
npm run build      # 一次性打包
npm run dev        # watch 模式
```

---

## 使用说明

### 首次启用

插件启用后会自动：

- 创建 `Sherlock OS/` 下的六个工作文件夹。
- 将内置图片复制到 `Sherlock OS/Assets/`。
- 应用全局暗色主题样式。
- 打开 Sherlock 工作台入口屏。

### 创建案件与任务

1. 在 **Project Desk** 点击「New Case」或在命令面板执行 `Create a new case file`。
2. 打开案件文件编辑案情。
3. 在案件工作区或命令面板中为案件创建任务。
4. 任务会出现在 Project Desk 左侧「待安排任务」，可拖拽到右侧周排期。

### 排期与冲突

- 拖拽任务到时间格：自动创建 Schedule 并关联原任务。
- 拖拽已有 Schedule  pill：移动排期。
- 点击 `+30m` / `-30m`：调整时长（30~240 分钟）。
- 冲突时间格会标红，点击「顺延一条」自动找下一个空档。

### 研读与证物

1. 在 **Archive Desk** 创建「研读条目」。
2. 阅读完成后点击「归入证物柜」。
3. 插件会生成一份新的 Evidence 文件，并保留原 Collection 文件（状态变为 `finished`）。

### 足迹

1. 进入 **Memory Map**，鼠标会变成十字准星。
2. 在地图希望的位置点击，会弹出确认框。
3. 点击「确定」后，系统会在点击处生成一个小勾，并自动新建一份以时间戳命名的足迹 Markdown 文件；点击标记即可打开编辑。
4. 删除该 Markdown 文件后，地图上的小勾会随之消失。

---

## 配置

进入 **Settings → Sherlock OS Settings** 可调整：

- 案件/任务/排期文件夹路径
- 雾气强度（首页氛围层）
- 动态强度（为后续动画预留）

---

## 扩展与修改方向

基于当前架构，常见的后续增强点包括：

1. **视图层扩展**：在 `src/view.ts` 中新增 `SherlockScreen` 和对应的 `renderXxx()` 方法，即可添加新页面。
2. **实体类型扩展**：在 `src/types.ts` 增加类型，在 `src/data.ts` 增加模板和解析逻辑，在 `collectWorkspaceData()` 中加入扫描分支。
3. **命令扩展**：在 `SherlockOSPlugin.onload()` 中通过 `this.addCommand()` 注册新命令。
4. **设置项扩展**：在 `src/settings.ts` 的 `display()` 中添加 Setting 控件。
5. **数据源扩展**：当前 `collectWorkspaceData()` 只扫描 Markdown 文件，如需索引 PDF/图片，可扩展扫描逻辑。
6. **地图扩展**：`resolveMapPoint()` 使用等距圆柱投影，中心经度 105°（中国为中心），可替换为更精确的投影或交互式地图库。
7. **样式调整**：所有视觉变量集中在 `:root` / `.sherlock-os-view` 和 `body.sherlock-global-style`，便于主题化。

---

## 许可

MIT
