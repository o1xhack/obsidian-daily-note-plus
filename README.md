# Daily Note Plus

[![Latest release](https://img.shields.io/github/v/release/o1xhack/obsidian-daily-note-plus?include_prereleases&label=release&color=7c3aed)](https://github.com/o1xhack/obsidian-daily-note-plus/releases)
[![Total downloads](https://img.shields.io/github/downloads/o1xhack/obsidian-daily-note-plus/total?color=7c3aed)](https://github.com/o1xhack/obsidian-daily-note-plus/releases)
[![License](https://img.shields.io/github/license/o1xhack/obsidian-daily-note-plus?color=7c3aed)](LICENSE)
[![Obsidian version](https://img.shields.io/badge/Obsidian-0.15.0%2B-7c3aed)](https://obsidian.md)

**Create missing Obsidian daily notes without opening each day, including backfilled ranges that use nested folder formats.**

> English · [简体中文](docs/i18n/README.zh-CN.md)

---

## Why?

- **Backfill any date range** — create missing daily notes for a selected period instead of opening each date by hand.
- **Respect your Daily Notes setup** — uses your configured folder, format, and template from Daily Notes or Periodic Notes.
- **Nested paths work** _(new in v0.1.0)_ — detects existing notes with formats such as `YYYY/MM/DD` and `YYYY/YYYY.MM.DD`.
- **Startup automation stays optional** — create today's note, auto-fill missed notes, or run the command manually.

## Nested Daily Note Formats

Daily Note Plus checks existing notes using the full path relative to your configured daily note folder, then parses that path with the full date format.

```text
Daily Notes folder: DailyNotes
Date format:        YYYY/MM/DD
Existing note:      DailyNotes/2025/05/12.md
Parsed date:        2025-05-12
```

This fixes the common failure mode where a plugin only reads the final file name, such as `12.md`, and cannot tell which year or month it belongs to.

## Backfill Missing Notes

Use the `Create missing daily notes` command to select a start and end date. Daily Note Plus scans the notes that already exist and only creates the missing dates.

```text
Range:    2025-12-28 to 2026-01-03
Existing: 2025/12/28.md, 2026/01/01.md
Creates:  2025/12/29.md, 2025/12/30.md, 2025/12/31.md, 2026/01/02.md, 2026/01/03.md
```

If more than seven notes would be created on startup, Daily Note Plus asks for confirmation before continuing.

![Options](images/options.png)

![Create missing daily notes modal](images/modal.png)

## Quick Start

1. Install Daily Note Plus with [BRAT](https://github.com/TfTHacker/obsidian42-brat).
2. Enable Obsidian's Daily Notes core plugin, or enable Periodic Notes if you use that workflow.
3. Configure your daily note folder and format, such as `YYYY-MM-DD`, `YYYY/YYYY.MM.DD`, or `YYYY/MM/DD`.
4. Run `Create missing daily notes` from the command palette.

## Install

<details open>
<summary><b>BRAT (recommended)</b></summary>

BRAT is the recommended install method while Daily Note Plus is not yet listed in the Obsidian community plugin directory.

1. Install and enable [BRAT](https://github.com/TfTHacker/obsidian42-brat) from Obsidian's community plugins.
2. Open the command palette and run `BRAT: Add a beta plugin for testing`.
3. Paste this repository URL:

```text
https://github.com/o1xhack/obsidian-daily-note-plus
```

4. Confirm the prompt and let BRAT download the latest release.
5. Go to `Settings -> Community plugins`, refresh the plugin list if needed, and enable `Daily Note Plus`.

Daily Note Plus currently publishes GitHub releases with the files BRAT expects: `main.js`, `manifest.json`, and `styles.css`.

</details>

<details>
<summary><b>Manual</b></summary>

1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/o1xhack/obsidian-daily-note-plus/releases/latest).
2. Create this folder in your vault: `.obsidian/plugins/daily-note-plus/`
3. Put the three downloaded files in that folder.
4. Reload Obsidian.
5. Go to `Settings -> Community plugins` and enable `Daily Note Plus`.

</details>

<details>
<summary><b>Build from source</b></summary>

```bash
git clone https://github.com/o1xhack/obsidian-daily-note-plus.git
cd obsidian-daily-note-plus
npm ci
npm run build
```

Copy `main.js`, `manifest.json`, and `styles.css` into `.obsidian/plugins/daily-note-plus/` in your vault.

</details>

## Configuration

| Setting | Default | Description |
|---|---|---|
| `Create daily note on startup` | On | Creates today's daily note when the vault opens, but skips creation if today's note already exists. |
| `Auto-create missed daily notes on startup` | Off | Also backfills missing notes between the latest existing daily note and today. |
| Daily Notes `folder` | Your Obsidian setting | The root folder used when detecting and creating daily notes. |
| Daily Notes `format` | Your Obsidian setting | The full Moment date format, including folder segments like `YYYY/MM/DD`. |
| Daily Notes `template` | Your Obsidian setting | The template used by Obsidian's Daily Notes or Periodic Notes setup. |

## FAQ

<details>
<summary><b>Does it support nested folders like <code>YYYY/MM/DD</code>?</b></summary>

Yes. Daily Note Plus detects existing notes by parsing the full path relative to your configured daily note folder, so `DailyNotes/2025/05/12.md` is recognized as `2025-05-12` when the format is `YYYY/MM/DD`.

</details>

<details>
<summary><b>Will it duplicate notes that already exist?</b></summary>

It should not duplicate notes that strictly match your configured daily note format. It builds a date index before creating missing notes, then skips dates already present in that index.

</details>

<details>
<summary><b>Does it support file names with extra title text?</b></summary>

Not yet. Daily Note Plus intentionally uses strict parsing, so `2025-05-12 Beach day.md` is not treated as a daily note unless your configured format also includes that title text pattern.

</details>

<details>
<summary><b>Why BRAT instead of the community plugin directory?</b></summary>

Daily Note Plus is currently distributed through GitHub releases while it is prepared for Obsidian community plugin submission. BRAT can install and update plugins directly from GitHub repositories during that phase.

</details>

## Roadmap

- [x] Rename the plugin to Daily Note Plus with plugin ID `daily-note-plus`.
- [x] Publish release `0.1.0`.
- [x] Support existing-note detection for nested daily note formats.
- [x] Publish release `0.2.0` for Obsidian community review warnings.
- [ ] Add broader in-vault test coverage for common date formats and long backfill ranges.
- [ ] Prepare Obsidian community plugin submission.

## Contributing

Issues and PRs are welcome. Before opening a PR, run:

```bash
npm run build
```

For larger behavior changes, open an issue first so the expected Daily Notes behavior is clear.

## Acknowledgements

Daily Note Plus is derived from Mario Holubar's [Daily note creator](https://github.com/mario-holubar/obsidian-daily-note-creator), licensed under the MIT License. This fork keeps the original backfill workflow and adds path-aware detection for nested daily note formats.

It also depends on [obsidian-daily-notes-interface](https://github.com/liamcain/obsidian-daily-notes-interface) for Daily Notes settings and note creation.

## License

MIT — see [LICENSE](LICENSE).

---

Author: [o1xhack](https://github.com/o1xhack)
