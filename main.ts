import { Modal, moment, normalizePath, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import type { App, ButtonComponent, TFile } from 'obsidian';
import type { Moment } from 'moment';
import { appHasDailyNotesPluginLoaded, getDailyNoteSettings, createDailyNote } from "obsidian-daily-notes-interface";
import {
	countDatesInRange,
	getPresetDateRange,
	MAX_BACKFILL_RANGE_DAYS,
	normalizeBackfillRange,
} from './date-range';
import type { DateRangePreset } from './date-range';

interface DailyNoteCreatorSettings {
	autoCreateCurrentDaily: boolean;
	autoCreateMissedDailies: boolean;
}

const DEFAULT_SETTINGS: DailyNoteCreatorSettings = {
	autoCreateCurrentDaily: true,
	autoCreateMissedDailies: false,
}

const DEFAULT_DAILY_NOTE_FORMAT = `YYYY-MM-DD`;

function getDateUID(date: Moment): string {
	return `day-${date.clone().startOf(`day`).format()}`;
}

function stripMarkdownExtension(path: string): string {
	return path.endsWith(`.md`) ? path.slice(0, -3) : path;
}

function getDailyNoteRelativePath(file: TFile, folder?: string): string | null {
	const normalizedFilePath = stripMarkdownExtension(normalizePath(file.path));
	const trimmedFolder = (folder ?? ``).trim();
	const normalizedFolder = trimmedFolder ? normalizePath(trimmedFolder).replace(/\/+$/, ``) : ``;

	if (!normalizedFolder) {
		return normalizedFilePath;
	}

	const folderPrefix = `${normalizedFolder}/`;
	if (!normalizedFilePath.startsWith(folderPrefix)) {
		return null;
	}

	return normalizedFilePath.slice(folderPrefix.length);
}

function getDateFromDailyNotePath(file: TFile): Moment | null {
	const { folder, format } = getDailyNoteSettings();
	const relativePath = getDailyNoteRelativePath(file, folder);
	if (!relativePath) {
		return null;
	}

	const noteDate = moment(relativePath, format ?? DEFAULT_DAILY_NOTE_FORMAT, true);
	return noteDate.isValid() ? noteDate : null;
}

function getAllDailyNotes(app: App): Record<string, TFile> {
	const dailyNotes: Record<string, TFile> = {};

	for (const file of app.vault.getMarkdownFiles()) {
		const date = getDateFromDailyNotePath(file);
		if (date) {
			dailyNotes[getDateUID(date)] = file;
		}
	}

	return dailyNotes;
}

function getDailyNote(date: Moment, dailyNotes: Record<string, TFile>): TFile | null {
	return dailyNotes[getDateUID(date)] ?? null;
}

function getNextDate(date: Moment): Moment {
	return date.clone().add(1, `day`);
}

// Find the date of the first and last daily notes that exist in the vault
function getFirstAndLastDates(dailyNotes: Record<string, TFile>): { first: Moment | null; last: Moment | null } {
	const sortedDailyNotes = Object.entries(dailyNotes).sort();

	// Fall back to today's date if there are no daily notes
	if (sortedDailyNotes.length === 0) {
		return { first: null, last: null };
	}

	const [, firstFile] = sortedDailyNotes[0];
	const [, lastFile] = sortedDailyNotes[sortedDailyNotes.length - 1];
	const firstDate = getDateFromDailyNotePath(firstFile);
	const lastDate = getDateFromDailyNotePath(lastFile);

	return { first: firstDate, last: lastDate };
}

// Find all dates for which daily notes are missing between start and end date
function findMissingDates(dailyNotes: Record<string, TFile>, start: Moment, end: Moment): Moment[] {
	const missingDates: Moment[] = [];
	const currentDate = start.clone();
	while (currentDate.isSameOrBefore(end)) {
		if (!getDailyNote(currentDate, dailyNotes)) {
			missingDates.push(currentDate.clone());
		}
		currentDate.add(1, `day`);
	}
	return missingDates;
}

// Create daily notes
async function createDailyNotes(dates: Moment[]): Promise<void> {
	await Promise.all(dates.map(async date => {
		await createDailyNote(date);
	}));
	if (dates.length > 0) {
		new Notice(`Created ${dates.length} daily note` + (dates.length == 1 ? `` : `s`));
	}
}

// Modal dialog for creating missing daily notes
class DailyNoteCreatorModal extends Modal {
	dailyNotes: Record<string, TFile>;
	startDate: Moment;
	endDate: Moment;
	missingDates: Moment[];
	onConfirm: (() => void) | undefined;

	constructor(app: App, dailyNotes: Record<string, TFile>, startDate: Moment, endDate: Moment, onConfirm?: () => void) {
		super(app);
		this.dailyNotes = dailyNotes;
		this.startDate = startDate;
		this.endDate = endDate;
		this.missingDates = [];
		this.onConfirm = onConfirm;
	}

		onOpen(): void {
			const { titleEl, contentEl } = this;
			titleEl.setText('Backfill daily notes');

		const applyPreset = (preset: DateRangePreset): void => {
			const { start, end } = getPresetDateRange(preset, moment());
			this.startDate = start;
			this.endDate = end;
			startDateInputEl.value = this.startDate.format(DEFAULT_DAILY_NOTE_FORMAT);
			endDateInputEl.value = this.endDate.format(DEFAULT_DAILY_NOTE_FORMAT);
			update();
		};

		// Quick presets fill the date inputs. They do not create notes.
		new Setting(contentEl)
			.setName('Quick ranges')
			.addButton(button => button
				.setButtonText('Last 7 days')
				.onClick(() => applyPreset(`last-7`)))
			.addButton(button => button
				.setButtonText('Last 30 days')
				.onClick(() => applyPreset(`last-30`)))
			.addButton(button => button
				.setButtonText('This month')
				.onClick(() => applyPreset(`this-month`)))
			.addButton(button => button
				.setButtonText('Last month')
				.onClick(() => applyPreset(`last-month`)));

		// Create input fields for start and end date
		const startDateInput = new Setting(contentEl)
			.setName('Start date')
		const startDateInputEl = startDateInput.controlEl.createEl('input', {
			attr: { type: 'date' },
			value: this.startDate.format(DEFAULT_DAILY_NOTE_FORMAT)
		});
		startDateInputEl.addEventListener('change', (event) => {
			this.startDate = moment((event.target as HTMLInputElement).value);
			update();
		});
		const endDateInput = new Setting(contentEl)
			.setName('End date')
		const endDateInputEl = endDateInput.controlEl.createEl('input', {
			attr: { type: 'date' },
			value: this.endDate.format(DEFAULT_DAILY_NOTE_FORMAT)
		});
		endDateInputEl.addEventListener('change', (event) => {
			this.endDate = moment((event.target as HTMLInputElement).value);
			update();
		});

		const rangeStats = new Setting(contentEl)
			.setName('Range: 0 days')
			.setDesc('Existing daily notes: 0');

		// Create confirmation buttons
		let confirmButton: ButtonComponent | null = null;
		const confirmation = new Setting(contentEl)
			.addButton(confirm => {
				confirmButton = confirm;
					confirm
						.setButtonText(`Start backfill`)
						.setCta()
						.setDisabled(true)
						.onClick(async () => {
							this.close();
							await createDailyNotes(this.missingDates);
							if (this.onConfirm) {
								this.onConfirm();
							}
						});
				})
			.addButton(cancel => cancel
				.setButtonText(`Cancel`)
				.onClick(() => {
					this.close();
				}));

		// Find missing dates and update labels
		const update = (): void => {
			const { format } = getDailyNoteSettings();
			const dateFormat = format ?? DEFAULT_DAILY_NOTE_FORMAT;
			const normalizedRange = normalizeBackfillRange(this.startDate, this.endDate, moment(), MAX_BACKFILL_RANGE_DAYS);
			startDateInput.setDesc(normalizedRange.start ? normalizedRange.start.format(dateFormat) : `Invalid date`);
			endDateInput.setDesc(normalizedRange.end ? normalizedRange.end.format(dateFormat) : `Invalid date`);

			if (normalizedRange.isValid && normalizedRange.start && normalizedRange.end) {
				const existingCount = countDatesInRange(normalizedRange.start, normalizedRange.end, date => Boolean(getDailyNote(date, this.dailyNotes)));
				this.missingDates = findMissingDates(this.dailyNotes, normalizedRange.start, normalizedRange.end);
				const rangeNotes = [
					normalizedRange.truncated ? `truncated to ${MAX_BACKFILL_RANGE_DAYS} days` : null,
					normalizedRange.futureClamped ? `future end date clamped to today` : null,
				].filter((note): note is string => Boolean(note));
				rangeStats
					.setName(`Range: ${normalizedRange.dayCount} day` + (normalizedRange.dayCount == 1 ? `` : `s`))
					.setDesc(`Existing daily notes: ${existingCount}` + (rangeNotes.length ? ` (${rangeNotes.join(`; `)})` : ``));
			} else {
				this.missingDates = [];
				rangeStats
					.setName('Range: 0 days')
					.setDesc('Existing daily notes: 0');
			}
			confirmation.setName(`Create ${this.missingDates.length} missing daily note` + (this.missingDates.length == 1 ? `?` : `s?`));
			confirmButton?.setDisabled(!normalizedRange.isValid || this.missingDates.length === 0);
		}

		update();
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}
}

export default class DailyNoteCreator extends Plugin {
	settings: DailyNoteCreatorSettings;

	async onload(): Promise<void> {
		// Load settings
		await this.loadSettings();

		// Create settings tab
		this.addSettingTab(new DailyNoteCreatorSettingTab(this.app, this));

		// Create command to open the modal dialog
		this.addCommand({
			id: 'create-missing-daily-notes',
			name: 'Create missing daily notes',
			callback: () => {
				if (!appHasDailyNotesPluginLoaded()) {
					new Notice(`Daily notes are disabled`);
					return;
				}
				const dailyNotes = getAllDailyNotes(this.app);
				const { last } = getFirstAndLastDates(dailyNotes);
				const today = moment();
				new DailyNoteCreatorModal(this.app, dailyNotes, last ?? today, today).open();
			}
		});

		// Create daily notes on startup
		this.app.workspace.onLayoutReady(async () => {
			if (!appHasDailyNotesPluginLoaded()) {
				new Notice(`Daily Note Plus: Daily notes are disabled`);
				return;
			}
			if (this.settings.autoCreateCurrentDaily) {
				const dailyNotes = getAllDailyNotes(this.app);
				const today = moment();
				if (this.settings.autoCreateMissedDailies) {
					// Create missed daily notes after the latest existing daily.
					const { last } = getFirstAndLastDates(dailyNotes);
					const startDate = last ? getNextDate(last) : today;
					const missing = findMissingDates(dailyNotes, startDate, today);
					// Ask for confirmation after one week
					if (missing.length <= 7) {
						await createDailyNotes(missing);
					} else {
						new DailyNoteCreatorModal(this.app, dailyNotes, last ?? today, today).open();
					}
				} else {
					// Only create today's daily note when it does not already exist.
					if (!getDailyNote(today, dailyNotes)) {
						await createDailyNote(today);
					}
				}
			}
		});
	}

	onunload(): void {
	}

	async loadSettings(): Promise<void> {
		const loadedSettings = await this.loadData() as Partial<DailyNoteCreatorSettings> | null;
		this.settings = Object.assign({}, DEFAULT_SETTINGS, loadedSettings);
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}

class DailyNoteCreatorSettingTab extends PluginSettingTab {
	plugin: DailyNoteCreator;

	constructor(app: App, plugin: DailyNoteCreator) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		if (!appHasDailyNotesPluginLoaded()) {
			containerEl.createEl(`p`, { text: `Enable daily notes to use this plugin.` });
			return;
		}

		// Find missing notes since first daily note
		const dailyNotes = getAllDailyNotes(this.app);
		const { first, last } = getFirstAndLastDates(dailyNotes);
		const today = moment();
		const missing = findMissingDates(dailyNotes, first ?? today, today);
		const n = missing.length;

		// Create backfill button
		const { format } = getDailyNoteSettings();
		const dateFormat = format ?? DEFAULT_DAILY_NOTE_FORMAT;
		new Setting(containerEl)
			.setName(n.toString() + ` missing daily note` + (n == 1 ? `` : `s`))
			.setDesc(`Since first daily (` + (first ? first.format(dateFormat) : `never`) + `)`)
			.addButton(toggle => toggle
				.setButtonText(`Create missing daily notes...`)
				.setCta()
				.onClick(() => {
					new DailyNoteCreatorModal(this.app, dailyNotes, first ?? today, today, () => {
						this.display();
					}).open();
				})
			);

		// Create auto-create toggle
		new Setting(containerEl)
			.setName(`Create daily note on startup`)
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.autoCreateCurrentDaily)
				.onChange(async () => {
					this.plugin.settings.autoCreateCurrentDaily = !this.plugin.settings.autoCreateCurrentDaily;
					await this.plugin.saveSettings();
					this.display();
				})
			);
		// Create auto-backfill toggle
		if (this.plugin.settings.autoCreateCurrentDaily) {
			new Setting(containerEl)
				.setName(`Auto-create missed daily notes on startup`)
				.setDesc(`Create missing notes between the latest existing daily (` + (last ? last.format(dateFormat) : `never`) + `) and today.`)
				.addToggle(toggle => toggle
					.setValue(this.plugin.settings.autoCreateMissedDailies)
					.onChange(async () => {
						this.plugin.settings.autoCreateMissedDailies = !this.plugin.settings.autoCreateMissedDailies;
						await this.plugin.saveSettings();
						this.display();
					})
				);
		}
	}
}
