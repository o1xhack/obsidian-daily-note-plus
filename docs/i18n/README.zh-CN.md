# Daily Note Plus

[![最新版本](https://img.shields.io/github/v/release/o1xhack/obsidian-daily-note-plus?include_prereleases&label=release&color=7c3aed)](https://github.com/o1xhack/obsidian-daily-note-plus/releases)
[![下载总数](https://img.shields.io/github/downloads/o1xhack/obsidian-daily-note-plus/total?color=7c3aed)](https://github.com/o1xhack/obsidian-daily-note-plus/releases)
[![许可证](https://img.shields.io/github/license/o1xhack/obsidian-daily-note-plus?color=7c3aed)](../../LICENSE)
[![Obsidian 版本](https://img.shields.io/badge/Obsidian-0.15.0%2B-7c3aed)](https://obsidian.md)

**为 Obsidian 自动补齐缺失的 Daily Notes，不需要逐天打开，并支持带文件夹层级的日期格式。**

> [English](../../README.md) · 简体中文

---

## 为什么用它？

- **补齐任意日期范围** —— 不用手动打开每一天，可以一次性创建一段时间内缺失的 Daily Notes。
- **尊重你的 Daily Notes 配置** —— 读取 Daily Notes 或 Periodic Notes 里的 folder、format、template。
- **支持层级路径** _(v0.1.0 新增)_ —— 可以识别 `YYYY/MM/DD`、`YYYY/YYYY.MM.DD` 这类按年月分文件夹的格式。
- **启动自动化可选** —— 可以只创建当天笔记，也可以启动时补缺失笔记，或者完全手动执行命令。

## 层级 Daily Note 格式

Daily Note Plus 会先用你配置的 daily note folder 去掉路径前缀，再用完整 date format 解析剩下的相对路径。

```text
Daily Notes folder: DailyNotes
Date format:        YYYY/MM/DD
已有笔记:           DailyNotes/2025/05/12.md
解析日期:           2025-05-12
```

这解决了只读取最后文件名导致的问题。例如只看到 `12.md` 时，插件无法判断它属于哪一年、哪一个月。

## 回溯补齐缺失笔记

执行命令 `Create missing daily notes` 后，你可以选择开始日期和结束日期。Daily Note Plus 会先扫描已有笔记，然后只创建缺失的日期。

```text
范围:  2025-12-28 到 2026-01-03
已有:  2025/12/28.md, 2026/01/01.md
创建:  2025/12/29.md, 2025/12/30.md, 2025/12/31.md, 2026/01/02.md, 2026/01/03.md
```

如果启动时需要创建超过 7 篇笔记，Daily Note Plus 会先弹窗确认。

![设置页](../../images/options.png)

![创建缺失 Daily Notes 弹窗](../../images/modal.png)

## 快速上手

1. 通过 [BRAT](https://github.com/TfTHacker/obsidian42-brat) 安装 Daily Note Plus。
2. 启用 Obsidian 的 Daily Notes 核心插件；如果你使用 Periodic Notes，也可以启用对应插件。
3. 配置 daily note folder 和 format，例如 `YYYY-MM-DD`、`YYYY/YYYY.MM.DD` 或 `YYYY/MM/DD`。
4. 在命令面板执行 `Create missing daily notes`。

## 安装

<details open>
<summary><b>BRAT（推荐）</b></summary>

在 Daily Note Plus 上架 Obsidian 社区插件目录之前，推荐通过 BRAT 安装。

1. 从 Obsidian 社区插件中安装并启用 [BRAT](https://github.com/TfTHacker/obsidian42-brat)。
2. 打开命令面板，执行 `BRAT: Add a beta plugin for testing`。
3. 粘贴这个仓库地址：

```text
https://github.com/o1xhack/obsidian-daily-note-plus
```

4. 确认安装，让 BRAT 下载最新 release。
5. 进入 `Settings -> Community plugins`，必要时刷新插件列表，然后启用 `Daily Note Plus`。

Daily Note Plus 当前的 GitHub release 已包含 BRAT 需要的 `main.js`、`manifest.json`、`styles.css`。

</details>

<details>
<summary><b>手动安装</b></summary>

1. 从 [最新发布版本](https://github.com/o1xhack/obsidian-daily-note-plus/releases/latest) 下载 `main.js`、`manifest.json`、`styles.css`。
2. 在你的 vault 里创建文件夹：`.obsidian/plugins/daily-note-plus/`
3. 把三个下载文件放进这个文件夹。
4. 重启或重新加载 Obsidian。
5. 进入 `Settings -> Community plugins`，启用 `Daily Note Plus`。

</details>

<details>
<summary><b>从源码构建</b></summary>

```bash
git clone https://github.com/o1xhack/obsidian-daily-note-plus.git
cd obsidian-daily-note-plus
npm ci
npm run build
```

然后把 `main.js`、`manifest.json`、`styles.css` 放入 vault 的 `.obsidian/plugins/daily-note-plus/`。

</details>

## 配置

| 选项 | 默认值 | 说明 |
|---|---|---|
| `Create daily note on startup` | 开启 | 打开 vault 时创建当天 Daily Note；如果当天笔记已存在，则不会重复创建。 |
| `Auto-create missed daily notes on startup` | 关闭 | 启动时额外补齐最后一篇已有 Daily Note 到今天之间缺失的日期。 |
| Daily Notes `folder` | 你的 Obsidian 设置 | 用于识别和创建 Daily Notes 的根目录。 |
| Daily Notes `format` | 你的 Obsidian 设置 | 完整 Moment 日期格式，可以包含 `YYYY/MM/DD` 这样的文件夹层级。 |
| Daily Notes `template` | 你的 Obsidian 设置 | 创建 Daily Note 时使用的模板。 |

## 常见问题

<details>
<summary><b>支持 <code>YYYY/MM/DD</code> 这种层级文件夹吗？</b></summary>

支持。Daily Note Plus 会用完整相对路径解析日期，所以当 format 是 `YYYY/MM/DD` 时，`DailyNotes/2025/05/12.md` 会被识别为 `2025-05-12`。

</details>

<details>
<summary><b>会重复创建已经存在的笔记吗？</b></summary>

只要已有笔记严格匹配你配置的 daily note format，就不会重复创建。插件会先建立已有日期索引，再只创建缺失日期。

</details>

<details>
<summary><b>支持文件名后面带标题吗？</b></summary>

暂不支持。Daily Note Plus 目前刻意使用 strict parsing，所以 `2025-05-12 Beach day.md` 不会被当成 Daily Note，除非你的 format 本身也包含对应标题格式。

</details>

<details>
<summary><b>为什么现在用 BRAT，而不是社区插件市场？</b></summary>

Daily Note Plus 目前先通过 GitHub release 分发，准备后续提交到 Obsidian 社区插件目录。BRAT 可以在这个阶段直接从 GitHub 仓库安装和更新插件。

</details>

## 路线图

- [x] 将插件重命名为 Daily Note Plus，插件 ID 为 `daily-note-plus`。
- [x] 发布 `0.1.0`。
- [x] 支持层级 daily note format 的已有笔记识别。
- [x] 发布 `0.2.0`，修复 Obsidian 社区审核警告。
- [ ] 补充常见日期格式和长时间范围回溯的 vault 内测试。
- [ ] 准备 Obsidian 社区插件提交。

## 参与贡献

欢迎提交 Issue 和 PR。提交 PR 前请运行：

```bash
npm run build
```

如果要改动较大的行为，建议先开 Issue 对齐 Daily Notes 的预期行为。

## 致谢

Daily Note Plus 派生自 Mario Holubar 的 [Daily note creator](https://github.com/mario-holubar/obsidian-daily-note-creator)，原项目使用 MIT License。本 fork 保留原有回溯补齐流程，并增加了对层级 Daily Note 格式的路径感知识别。

项目也依赖 [obsidian-daily-notes-interface](https://github.com/liamcain/obsidian-daily-notes-interface) 来读取 Daily Notes 设置并创建笔记。

## 许可证

MIT —— 见 [LICENSE](../../LICENSE)。

---

作者：[o1xhack](https://github.com/o1xhack)
