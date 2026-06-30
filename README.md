# Sherlock OS

一款受夏洛克·福尔摩斯启发的 Obsidian 插件，以「本地优先、案卷化组织」为核心，把案件、任务、排期、研读、证物和足迹整合进一张可交互的 221B 工作台。

所有数据都保存在你的 Obsidian 仓库里，插件本身不依赖任何外部服务或数据库。

---

## 目录

- [Sherlock OS](#sherlock-os)
  - [目录](#目录)
  - [它能做什么](#它能做什么)
  - [安装教程（新手一步一步来）](#安装教程新手一步一步来)
    - [方法一：直接下载仓库（推荐）](#方法一直接下载仓库推荐)
    - [方法二：从 GitHub 下载压缩包](#方法二从-github-下载压缩包)
    - [安装后检查清单](#安装后检查清单)
  - [首次启用会发生什么](#首次启用会发生什么)
  - [界面导览](#界面导览)
  - [基础操作](#基础操作)
    - [1. 打开 Sherlock 工作台](#1-打开-sherlock-工作台)
    - [2. 创建第一个案件](#2-创建第一个案件)
    - [3. 给案件添加任务](#3-给案件添加任务)
    - [4. 把任务排进日程](#4-把任务排进日程)
    - [5. 创建研读与证物](#5-创建研读与证物)
    - [6. 在足迹地图上标记地点](#6-在足迹地图上标记地点)
  - [配置说明](#配置说明)
    - [如何打开设置](#如何打开设置)
    - [可配置项](#可配置项)
  - [文件与文件夹结构](#文件与文件夹结构)
  - [常用命令](#常用命令)
  - [常见问题](#常见问题)
  - [技术架构（给想修改的人）](#技术架构给想修改的人)
  - [许可](#许可)

---

## 它能做什么

Sherlock OS 把日常项目管理重新包装成「侦探办案」的工作流：

| 实体 | 对应文件夹 | 日常生活中的用法 |
|------|-----------|----------------|
| **案件 (case)** | `Sherlock OS/Cases` | 一个项目、一个课题、一件要跟进的事 |
| **任务 (task)** | `Sherlock OS/Tasks` | 案件下的具体待办、线索、下一步动作 |
| **排期 (schedule)** | `Sherlock OS/Schedules` | 把任务安排到具体时间段 |
| **研读 (collection)** | `Sherlock OS/Collections` | 正在读的书、看的文章、追的剧 |
| **证物 (evidence)** | `Sherlock OS/Evidence` | 读完/研究完后沉淀下来的资料 |
| **足迹 (place)** | `Sherlock OS/Places` | 去过的地方、想记录的地点 |

所有这些内容都是**普通的 Markdown 文件**，frontmatter 里带一个 `type` 字段。即使以后不用这个插件，你的笔记也依然可读、可编辑。

---

## 安装教程（新手一步一步来）

### 方法一：直接下载仓库（推荐）

如果你电脑已经装了 Git：

1. 打开终端（Windows 用 PowerShell / Git Bash，Mac 用 Terminal）。
2. 进入你的 Obsidian 仓库目录。

   不确定仓库在哪里？在 Obsidian 里点击左下角「设置」→「文件与链接」→「库文件夹」，那里显示的路径就是你的仓库根目录。

3. 执行下面的命令：

   ```bash
   cd "你的仓库根目录/.obsidian/plugins"
   git clone https://github.com/uan-iel/obsidian-Sherlock-desk sherlock-os
   ```

   例如：

   ```bash
   cd "/Users/你的名字/Documents/My Vault/.obsidian/plugins"
   git clone https://github.com/uan-iel/obsidian-Sherlock-desk sherlock-os
   ```

4. 确保 `sherlock-os` 文件夹里有这些文件：

   ```
   sherlock-os/
   ├── main.js
   ├── manifest.json
   ├── styles.css
   └── assets/
       ├── sherlock-entry.png
       ├── sherlock-parlor.png
       └── sherlock-world-map.png
   ```

5. 进入下一步「首次启用会发生什么」。

### 方法二：从 GitHub 下载压缩包

如果你不想用 Git：

1. 打开浏览器，访问：
   `https://github.com/uan-iel/obsidian-Sherlock-desk`
2. 点击绿色的 **Code** 按钮 → **Download ZIP**。
3. 解压 ZIP，会得到一个 `obsidian-Sherlock-desk-main` 之类的文件夹。
4. 把它重命名为 `sherlock-os`。
5. 打开你的 Obsidian 仓库文件夹，找到 `.obsidian/plugins/` 目录。

   - Windows：一般在 `C:\Users\你的名字\Documents\My Vault\.obsidian\plugins\`
   - Mac：一般在 `/Users/你的名字/Documents/My Vault/.obsidian/plugins/`

6. 把重命名后的 `sherlock-os` 文件夹整个拖进去。
7. 检查 `sherlock-os` 文件夹里包含 `main.js`、`manifest.json`、`styles.css` 和 `assets/`。

### 安装后检查清单

- [ ] 插件文件夹路径是 `.obsidian/plugins/sherlock-os/`
- [ ] 文件夹里有 `main.js`、`manifest.json`、`styles.css` 和 `assets/`
- [ ] 文件夹名字必须是 `sherlock-os`，不能是 `obsidian-Sherlock-desk-main` 之类

如果名字不对，Obsidian 会找不到插件。

---

## 首次启用会发生什么

1. 在 Obsidian 里点击左下角「设置」→「社区插件」。
2. 找到 **Sherlock OS**，打开右侧开关。
3. 如果弹出安全提示，点击「启用」。
4. 插件会自动：
   - 在你的仓库里创建 `Sherlock OS/` 文件夹及六个子文件夹。
   - 应用暗色主题样式。
   - 打开 Sherlock 入口屏。

如果入口屏没有出现，点击左侧 Ribbon 栏的 🔍 放大镜图标，或按 `Ctrl/Cmd + P` 搜索 `Open Sherlock workspace`。

---

## 界面导览

打开 Sherlock 后，你会依次看到：

1. **Entry 入口屏**：一张复古卷宗背景，点击中央书卷进入主页。
2. **Home 主页**：三个入口——Project Desk、Archive Desk、Memory Map。
3. **Project Desk（案件桌）**：
   - 左侧：待安排任务、进行中案件。
   - 右侧：本周排期，可以拖拽任务到时间格。
4. **Archive Desk（档案桌）**：管理「正在研读」和「已归档证物」。
5. **Memory Map（足迹地图）**：在复古世界地图上点击任意位置，创建足迹。
6. **Case Workspace（案件工作区）**：单个案件的聚合页面，包含案情、任务、排期、证物和时间线。

---

## 基础操作

### 1. 打开 Sherlock 工作台

- 点击左侧 Ribbon 的 🔍 图标。
- 或按 `Ctrl/Cmd + P` 打开命令面板，输入 `Open Sherlock workspace`。

### 2. 创建第一个案件

- 在 Project Desk 点击「New Case」按钮。
- 或按 `Ctrl/Cmd + P`，执行 `Create a new case file`。
- 输入案件名称，插件会在 `Sherlock OS/Cases/` 下创建 Markdown 文件。

### 3. 给案件添加任务

- 打开一个案件文件，点击案件工作区里的「New Task」。
- 或按 `Ctrl/Cmd + P`，执行 `Create a task for the current case`。
- 输入任务名称。

### 4. 把任务排进日程

- 在 Project Desk 左侧「待安排任务」里，按住任务卡片拖到右侧周视图的时间格上。
- 拖上去后，插件会自动创建一个 Schedule 文件。
- 已经排好的任务会显示成彩色 pill，可以拖动调整时间，或点击 `+30m` / `-30m` 调整时长。
- 如果时间冲突，冲突格会标红，点击「顺延一条」会自动找下一个空档。

### 5. 创建研读与证物

- 进入 Archive Desk，点击「New Collection」创建研读条目。
- 读完后，在该卡片上点击「归入证物柜」。
- 插件会生成一份 Evidence 文件到 `Sherlock OS/Evidence/`，原 Collection 状态变为 `finished`。

### 6. 在足迹地图上标记地点

- 进入 Memory Map，鼠标会变成十字准星。
- 在想要标记的位置点击一下，会弹出确认框「是否确认创建足迹？」。
- 点击「确定」，插件会：
  - 在点击位置生成一个「✓」小勾。
  - 自动创建一份足迹 Markdown 文件到 `Sherlock OS/Places/`。
- 点击小勾可以打开对应的足迹文件。
- 删除该 Markdown 文件后，地图上的小勾会随之消失。

**注意**：小勾的位置依赖地图图片本身的比例。点击位置与渲染位置经过同一套投影计算，因此在当前地图上是自洽的。

---

## 配置说明

### 如何打开设置

1. 点击 Obsidian 左下角「设置」。
2. 左侧找到「社区插件」→「Sherlock OS Settings」。

### 可配置项

| 配置项 | 作用 |
|--------|------|
| 案件文件夹 | 案件文件存放位置，默认 `Sherlock OS/Cases` |
| 任务文件夹 | 任务文件存放位置，默认 `Sherlock OS/Tasks` |
| 排期文件夹 | 排期文件存放位置，默认 `Sherlock OS/Schedules` |
| 雾气强度 | 入口屏和主页的氛围层浓度 |
| 动态强度 | 为后续动画预留，当前可忽略 |

修改文件夹后，插件会自动创建新文件夹，旧文件不会自动迁移。

---

## 文件与文件夹结构

安装后，你的仓库里会出现：

```
你的仓库/
├── Sherlock OS/
│   ├── Cases/        # 案件
│   ├── Tasks/        # 任务
│   ├── Schedules/    # 排期
│   ├── Collections/  # 研读
│   ├── Evidence/     # 证物
│   └── Places/       # 足迹
└── .obsidian/
    └── plugins/
        └── sherlock-os/
            ├── main.js
            ├── manifest.json
            ├── styles.css
            └── assets/
```

所有笔记都是标准 Markdown，frontmatter 类似：

```yaml
---
type: case
title: "神秘失踪的猫"
created: 2026-06-29T12:00:00.000Z
updated: 2026-06-29T12:00:00.000Z
status: open
priority: medium
tags: "[]"
---
```

---

## 常用命令

按 `Ctrl/Cmd + P` 打开命令面板，搜索：

| 命令 | 作用 |
|------|------|
| Open Sherlock workspace | 打开 Sherlock 工作台 |
| Create a new case file | 创建新案件 |
| Create a new task file | 创建独立任务 |
| Create a task for the current case | 为当前打开的案件创建任务 |
| Create evidence for the current case | 为当前案件创建证物 |
| Create a new schedule file | 创建新排期 |
| Create a new collection item | 创建研读条目 |
| Create a new footprint place | 创建足迹文件（不经过地图） |

---

## 常见问题

**Q1：安装后插件列表里找不到 Sherlock OS？**

- 检查插件文件夹名字是否为 `sherlock-os`。
- 检查文件夹里是否有 `main.js`、`manifest.json`、`styles.css`。
- 检查是否放在了正确的 `.obsidian/plugins/` 目录下。

**Q2：入口屏/地图图片不显示？**

- 确认 `sherlock-os/assets/` 文件夹存在，且包含三张 png 图片。
- 重启 Obsidian。
- 在桌面端打开开发者工具（`Ctrl/Cmd + Option + I`），查看 Console 是否有 `[Sherlock OS]` 开头的红色报错。

**Q3：点击地图后没有小勾？**

- 确认你点击的是地图空白处，而不是已有的小勾。
- 检查 `Sherlock OS/Places/` 下是否生成了新文件。
- 重启插件或 Obsidian 后重试。

**Q4：小勾位置和点击位置不一致？**

- 确保你使用的是最新版本。
- 地图使用固定比例的投影，点击位置和渲染位置经过同一套计算，自洽于当前地图。

**Q5：可以修改主题颜色吗？**

- 可以编辑 `styles.css` 里的 CSS 变量，但升级插件时会被覆盖。建议用 Obsidian 的 CSS 片段功能覆盖样式。

---

## 技术架构（给想修改的人）

```
.
├── src/
│   ├── main.ts          # 插件主类：生命周期、命令、文件操作
│   ├── view.ts          # 自定义 ItemView：所有 UI 渲染与交互
│   ├── data.ts          # 数据层：模板、文件夹初始化、Vault 扫描
│   ├── settings.ts      # 设置面板
│   ├── types.ts         # TypeScript 类型定义
│   └── electron-shim.d.ts  # electron shell 类型声明
├── assets/              # 插件内置图片
├── styles.css           # 全局样式
├── main.js              # esbuild 打包产物
├── manifest.json        # Obsidian 插件清单
├── versions.json        # 版本与最低 Obsidian 版本对应
└── esbuild.config.mjs   # 构建配置
```

数据流：

1. 用户通过命令或 UI 触发创建。
2. `data.ts` 生成带标准 frontmatter 的 Markdown。
3. 文件写入 `Sherlock OS/` 下对应子文件夹。
4. `collectWorkspaceData()` 扫描所有 Markdown，按 `type` 解析。
5. `SherlockWorkspaceView` 拿到数据后渲染当前屏幕。
6. Vault 的 `create` / `modify` / `delete` 事件自动触发视图刷新。

开发构建：

```bash
npm install
npm run build      # 一次性打包
npm run dev        # watch 模式
```

---

## 许可

MIT
