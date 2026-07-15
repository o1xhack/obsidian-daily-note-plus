# Daily Note Plus

[![最新版本](https://img.shields.io/github/v/release/o1xhack/obsidian-daily-note-plus?include_prereleases&label=release&color=7c3aed)](https://github.com/o1xhack/obsidian-daily-note-plus/releases)
[![下载总数](https://img.shields.io/github/downloads/o1xhack/obsidian-daily-note-plus/total?color=7c3aed)](https://github.com/o1xhack/obsidian-daily-note-plus/releases)
[![许可证](https://img.shields.io/github/license/o1xhack/obsidian-daily-note-plus?color=7c3aed)](../../LICENSE)
[![Obsidian 版本](https://img.shields.io/badge/Obsidian-0.15.0%2B-7c3aed)](https://obsidian.md)

[![GitHub Sponsors](https://img.shields.io/badge/Sponsor-GitHub%20Sponsors-ea4aaa?logo=githubsponsors&logoColor=white)](https://github.com/sponsors/o1xhack)

**为 Obsidian 自动补齐缺失的 Daily Notes，不需要逐天打开，并支持带文件夹层级的日期格式。**

> [English](../../README.md) · 简体中文

---

## 为什么用它？

- **补齐任意日期范围** —— 不用手动打开每一天，可以一次性创建一段时间内缺失的 Daily Notes。
- **尊重你的 Daily Notes 配置** —— 读取 Daily Notes 或 Periodic Notes 里的 folder、format、template。
- **支持层级路径** —— 可以识别 `YYYY/MM/DD`、`YYYY/YYYY.MM.DD` 这类按年月分文件夹的格式。
- **启动自动化可选** _(v0.2.1 修复)_ —— 打开 vault 时创建当天笔记，并避免重复创建。
- **桌面端每日定时创建** —— 即使 Obsidian 连续多天不关闭，也能按用户本地时间自动创建当天笔记。
- **更安全的回溯弹窗** _(v0.3.0 新增)_ —— 支持快捷日期、实时统计、非法区间禁用确认按钮，降低误操作风险。

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

如果自动补建的历史笔记超过 7 篇，Daily Note Plus 会先创建今天的笔记，再要求你确认是否继续创建更早的日期。

回溯弹窗提供最近 7 天、最近 30 天、本月、上月这几个快捷选项。快捷按钮只会填写日期，不会直接创建文件；只有点击 `Start backfill` 才会执行。弹窗也会实时显示区间天数，以及这个区间里已经存在多少篇 Daily Note。

非法日期区间会禁用确认按钮。未来结束日期会自动按今天截断，超大区间会限制为最多 3650 天，避免误触发过大的回溯。

![设置页](../../images/options.png)

![创建缺失 Daily Notes 弹窗](../../images/modal.png)

## 快速上手

1. 从 Obsidian 社区插件市场安装 Daily Note Plus。
2. 启用 Obsidian 的 Daily Notes 核心插件；如果你使用 Periodic Notes，也可以启用对应插件。
3. 配置 daily note folder 和 format，例如 `YYYY-MM-DD`、`YYYY/YYYY.MM.DD` 或 `YYYY/MM/DD`。
4. 在命令面板执行 `Create missing daily notes`。

## 安装

<details open>
<summary><b>社区插件市场（推荐）</b></summary>

Daily Note Plus 已经进入 Obsidian 社区插件目录，因此这是默认推荐安装方式。如果暂时搜索不到，等待 Obsidian 插件列表刷新后再试。

1. 打开 `Settings -> Community plugins`。
2. 如果 Obsidian 提示，请关闭 Restricted mode。
3. 点击 `Browse`。
4. 搜索 `Daily Note Plus`。
5. 点击 `Install`。
6. 点击 `Enable`，或者稍后在 `Settings -> Community plugins -> Installed plugins` 里启用 `Daily Note Plus`。

</details>

<details>
<summary><b>从 BRAT 迁移</b></summary>

如果你之前通过 [BRAT](https://github.com/TfTHacker/obsidian42-brat) 安装 Daily Note Plus，可以按下面步骤切换到社区插件市场更新。

1. 进入 `Settings -> Community plugins -> Installed plugins`。
2. 先关闭 `Daily Note Plus`。
3. 进入 `Settings -> BRAT`。
4. 在 BRAT 的 beta plugin 列表里找到 `o1xhack/obsidian-daily-note-plus`。
5. 点击旁边的 `x`，然后确认将它从 BRAT 更新列表里移除。
6. 回到 `Settings -> Community plugins`，点击 `Browse`，搜索 `Daily Note Plus`。
7. 因为插件 ID 一样，都是 `daily-note-plus`，这里应该会显示为 `Installed`。
8. 从社区插件页面或已安装插件列表重新启用 `Daily Note Plus`。

从 BRAT 移除仓库只会停止 BRAT 管理更新，不会删除 vault 里的插件文件。之后 Obsidian 会通过正常的社区插件更新流程管理它。

</details>

<details>
<summary><b>手动安装 release</b></summary>

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
| `Create daily note on schedule` | 开启 | 仅在电脑端生效；到达设定的本地时间后检查并创建当天笔记。已有用户升级时会继承原来的 startup 开关偏好。 |
| `Daily creation time` | `00:00` | 定时创建使用的电脑本地时间；如果电脑当时处于休眠，会在恢复后补触发。 |
| `Auto-create missed daily notes` | 关闭 | startup 或定时触发时，额外补齐最后一篇已有 Daily Note 到昨天之间缺失的日期。 |
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

startup、定时触发和手动回溯共用同一个串行创建队列。每个排队任务在真正创建前都会重新扫描 vault，因此多个触发机制重叠时，同一个日期仍然最多只会创建一篇笔记。

</details>

<details>
<summary><b>手机端会执行定时创建吗？</b></summary>

不会。定时触发器只会在 Electron 电脑端注册；手机端仍然可以使用 startup 创建和手动回溯命令。

</details>

<details>
<summary><b>支持文件名后面带标题吗？</b></summary>

暂不支持。Daily Note Plus 目前刻意使用 strict parsing，所以 `2025-05-12 Beach day.md` 不会被当成 Daily Note，除非你的 format 本身也包含对应标题格式。

</details>

<details>
<summary><b>我之前通过 BRAT 安装，需要卸载插件吗？</b></summary>

不需要。你只需要在 BRAT 里移除 `o1xhack/obsidian-daily-note-plus`，让 BRAT 停止管理更新，然后通过 Obsidian 社区插件界面启用同一个已安装插件。只有在你想彻底删除 Daily Note Plus 时，才需要在 Obsidian 里执行 `Uninstall`。

</details>

## 路线图

- [x] 将插件重命名为 Daily Note Plus，插件 ID 为 `daily-note-plus`。
- [x] 发布 `0.1.0`。
- [x] 支持层级 daily note format 的已有笔记识别。
- [x] 发布 `0.2.0`，修复 Obsidian 社区审核警告。
- [x] 发布 `0.2.1`，避免启动时重复创建已有 Daily Note。
- [x] 进入 Obsidian 社区插件目录。
- [x] 发布 `0.3.0`，支持快捷日期、实时区间统计、输入校验，并加入测试。
- [x] 发布 `0.4.0`，支持按本地时间在电脑端每日定时创建，并处理休眠恢复后的补触发。
- [ ] 补充常见日期格式和长时间范围回溯的 vault 内测试。

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
