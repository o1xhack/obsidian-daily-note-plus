# Daily Note Plus

Do you want [Obsidian](https://obsidian.md/) to create your [daily notes](https://help.obsidian.md/Plugins/Daily+notes) automatically, without opening the daily note on startup, and including days that you haven't opened the vault? Then this is the plugin for you!

It acts as an alternative to [Auto Journal](https://github.com/Ebonsignori/obsidian-auto-journal). Auto Journal also has backfill functionality and comes with more features such as monthly notes, but also enforces a certain folder structure.

Daily Note Plus is designed to be an add-on to the daily notes core plugin, rather than a replacement, and will use the settings you defined there to create missing notes.

Daily Note Plus is derived from Mario Holubar's [Daily note creator](https://github.com/mario-holubar/obsidian-daily-note-creator), licensed under the MIT License.

## Features

![options](images/options.png)

Daily Note Plus reads the Daily Notes or Periodic Notes folder and format settings when it checks existing notes. Formats with folder segments, such as `YYYY/MM/DD` or `YYYY/YYYY.MM.DD`, are supported for both creating notes and detecting which dates already exist.

**Create daily note on startup** lets you disable the built-in `open daily note on startup` option. This is useful if you want to open the vault on your last open note, or your homepage.

**Auto-create missed daily notes on startup** will fill in daily notes for days that you didn't open the vault. If this is more than a week, it will ask for confirmation.

**Create missing daily notes** is a command you can trigger anytime to open a pop-up window that lets you fill in missed notes for any range of time. Use this if you want to fill in some missing days in the past.

![modal](images/modal.png)

## Known issues

The plugin still expects daily note paths to strictly match your configured Daily Notes format. File names with extra title text, such as `2023-12-31 Beach day.md`, are not treated as daily notes.
