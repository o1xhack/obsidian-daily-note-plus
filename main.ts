import { Modal, moment, normalizePath, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import type { App, TFile } from 'obsidian';
import type { Moment } from 'moment';
import { appHasDailyNotesPluginLoaded, getDailyNoteSettings, createDailyNote } from "obsidian-daily-notes-interface";

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
		titleEl.setText('Create missing daily notes');

		// Create input fields for start and end date
		const startDateInput = new Setting(contentEl)
			.setName('Start date')
		startDateInput.controlEl.createEl('input', {
			attr: { type: 'date' },
			value: this.startDate.format('YYYY-MM-DD')
		}).addEventListener('change', (event) => {
			this.startDate = moment((event.target as HTMLInputElement).value);
			update();
		});
		const endDateInput = new Setting(contentEl)
			.setName('End date')
		endDateInput.controlEl.createEl('input', {
			attr: { type: 'date' },
			value: this.endDate.format('YYYY-MM-DD')
		}).addEventListener('change', (event) => {
			this.endDate = moment((event.target as HTMLInputElement).value);
			update();
		});

		// Create confirmation buttons
		const confirmation = new Setting(contentEl)
			.addButton(confirm => confirm
				.setButtonText(`Confirm`)
				.setCta()
				.onClick(async () => {
					this.close();
					await createDailyNotes(this.missingDates);
					if (this.onConfirm) {
						this.onConfirm();
					}
				}))
			.addButton(cancel => cancel
				.setButtonText(`Cancel`)
				.onClick(() => {
					this.close();
				}));

		// Find missing dates and update labels
		const update = (): void => {
			const { format } = getDailyNoteSettings();
			const dateFormat = format ?? DEFAULT_DAILY_NOTE_FORMAT;
			const startDateValid = this.startDate.isValid() && this.startDate.year().toString().length === 4;
			const endDateValid = this.endDate.isValid() && this.endDate.year().toString().length === 4;
			startDateInput.setDesc(startDateValid ? this.startDate.format(dateFormat) : `Invalid date`);
			endDateInput.setDesc(endDateValid ? this.endDate.format(dateFormat) : `Invalid date`);
			if (startDateValid && endDateValid) {
				this.missingDates = findMissingDates(this.dailyNotes, this.startDate, this.endDate);
			} else {
				this.missingDates = [];
			}
			confirmation.setName(`Create ${this.missingDates.length} missing daily note` + (this.missingDates.length == 1 ? `?` : `s?`));
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
				if (this.settings.autoCreateMissedDailies) {
					// Create missed daily notes
					const dailyNotes = getAllDailyNotes(this.app);
					const { last } = getFirstAndLastDates(dailyNotes);
					const today = moment();
					const missing = findMissingDates(dailyNotes, last ?? today, today);
					// Ask for confirmation after one week
					if (missing.length <= 7) {
						await createDailyNotes(missing);
					} else {
						new DailyNoteCreatorModal(this.app, dailyNotes, last ?? today, today).open();
					}
				} else {
					// Only create today's daily note
					await createDailyNote(moment());
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
				.setDesc(`Since last daily (` + (last ? last.format(dateFormat) : `never`) + `)`)
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
