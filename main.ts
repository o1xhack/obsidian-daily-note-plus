import { Modal, moment, normalizePath, Notice, Platform, Plugin, PluginSettingTab, Setting } from 'obsidian';
import type { App, ButtonComponent, TFile } from 'obsidian';
import { appHasDailyNotesPluginLoaded, getDailyNoteSettings, createDailyNote } from "obsidian-daily-notes-interface";
import {
	DEFAULT_DAILY_CREATION_TIME,
	getNextDailyCreationDate,
	getLocalDateKey,
	isValidDailyCreationTime,
	normalizeDailyCreationTime,
	shouldRunScheduledCreation,
} from './daily-schedule';
import {
	countDatesInRange,
	getPresetDateRange,
	MAX_BACKFILL_RANGE_DAYS,
	normalizeBackfillRange,
} from './date-range';
import type { DateRangePreset } from './date-range';

type Moment = ReturnType<typeof moment>;

interface DailyNoteCreatorSettings {
	autoCreateCurrentDaily: boolean;
	autoCreateMissedDailies: boolean;
	autoCreateDailyOnSchedule: boolean;
	dailyCreationTime: string;
}

const DEFAULT_SETTINGS: DailyNoteCreatorSettings = {
	autoCreateCurrentDaily: true,
	autoCreateMissedDailies: false,
	autoCreateDailyOnSchedule: true,
	dailyCreationTime: DEFAULT_DAILY_CREATION_TIME,
}

const DEFAULT_DAILY_NOTE_FORMAT = `YYYY-MM-DD`;
const SCHEDULE_RETRY_INTERVAL_MS = 5 * 60 * 1000;

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

// Modal dialog for creating missing daily notes
class DailyNoteCreatorModal extends Modal {
	dailyNotes: Record<string, TFile>;
	startDate: Moment;
	endDate: Moment;
	missingDates: Moment[];
	onCreate: (dates: Moment[]) => Promise<unknown>;
	onConfirm: (() => void) | undefined;

	constructor(
		app: App,
		dailyNotes: Record<string, TFile>,
		startDate: Moment,
		endDate: Moment,
		onCreate: (dates: Moment[]) => Promise<unknown>,
		onConfirm?: () => void,
	) {
		super(app);
		this.dailyNotes = dailyNotes;
		this.startDate = startDate;
		this.endDate = endDate;
		this.missingDates = [];
		this.onCreate = onCreate;
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
							await this.onCreate(this.missingDates);
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
	private automaticCreationPromise: Promise<void> | null = null;
	private creationQueue: Promise<void> = Promise.resolve();
	private lastScheduledRunDate: string | null = null;
	private nextScheduledRetryAt = 0;
	private scheduledCreationTimeout: number | null = null;
	private scheduledCreationStarted = false;

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
				new DailyNoteCreatorModal(
					this.app,
					dailyNotes,
					last ?? today,
					today,
					dates => this.createDailyNotes(dates),
				).open();
			}
		});

		this.app.workspace.onLayoutReady(() => {
			this.startScheduledCreation();
			void this.runStartupCreation();
		});
	}

	onunload(): void {
	}

	async loadSettings(): Promise<void> {
		const loadedSettings = await this.loadData() as Partial<DailyNoteCreatorSettings> | null;
		this.settings = Object.assign({}, DEFAULT_SETTINGS, loadedSettings);
		// Existing users inherit their startup preference for the new scheduled trigger.
		this.settings.autoCreateDailyOnSchedule = loadedSettings?.autoCreateDailyOnSchedule
			?? loadedSettings?.autoCreateCurrentDaily
			?? DEFAULT_SETTINGS.autoCreateDailyOnSchedule;
		this.settings.dailyCreationTime = normalizeDailyCreationTime(loadedSettings?.dailyCreationTime);
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	private startScheduledCreation(): void {
		if (!Platform.isDesktopApp) {
			return;
		}

		this.scheduledCreationStarted = true;
		this.register(() => this.clearScheduledCreationTimeout());
		this.registerDomEvent(window, `focus`, () => this.refreshScheduledCreation());
		this.refreshScheduledCreation();
	}

	refreshScheduledCreation(): void {
		this.clearScheduledCreationTimeout();
		if (
			!this.scheduledCreationStarted
			|| !Platform.isDesktopApp
			|| !this.settings.autoCreateDailyOnSchedule
		) {
			return;
		}

		const now = new Date();
		if (now.getTime() < this.nextScheduledRetryAt) {
			this.scheduleCreationTimeout(this.nextScheduledRetryAt - now.getTime());
			return;
		}
		if (shouldRunScheduledCreation(now, this.settings.dailyCreationTime, this.lastScheduledRunDate)) {
			void this.runScheduledCreation();
			return;
		}

		const nextCreation = getNextDailyCreationDate(
			now,
			this.settings.dailyCreationTime,
			this.lastScheduledRunDate,
		);
		if (nextCreation) {
			this.scheduleCreationTimeout(nextCreation.getTime() - now.getTime());
		}
	}

	private scheduleCreationTimeout(delay: number): void {
		this.scheduledCreationTimeout = window.setTimeout(() => {
			this.scheduledCreationTimeout = null;
			void this.runScheduledCreation();
		}, Math.max(0, delay));
	}

	private clearScheduledCreationTimeout(): void {
		if (this.scheduledCreationTimeout !== null) {
			window.clearTimeout(this.scheduledCreationTimeout);
			this.scheduledCreationTimeout = null;
		}
	}

	private async runStartupCreation(): Promise<void> {
		if (!this.settings.autoCreateCurrentDaily) {
			return;
		}
		if (!appHasDailyNotesPluginLoaded()) {
			new Notice(`Daily Note Plus: Daily notes are disabled`);
			return;
		}

		try {
			await this.runAutomaticCreation();
		} catch (error) {
			console.error(`Daily Note Plus: Startup creation failed`, error);
		}
	}

	private async runScheduledCreation(): Promise<void> {
		if (!Platform.isDesktopApp || !this.settings.autoCreateDailyOnSchedule) {
			return;
		}

		const now = new Date();
		const dateKey = getLocalDateKey(now);
		if (!shouldRunScheduledCreation(now, this.settings.dailyCreationTime, this.lastScheduledRunDate)) {
			this.refreshScheduledCreation();
			return;
		}
		if (!appHasDailyNotesPluginLoaded()) {
			this.nextScheduledRetryAt = now.getTime() + SCHEDULE_RETRY_INTERVAL_MS;
			this.refreshScheduledCreation();
			return;
		}

		try {
			await this.runAutomaticCreation();
			this.lastScheduledRunDate = dateKey;
			this.nextScheduledRetryAt = 0;
		} catch (error) {
			this.nextScheduledRetryAt = now.getTime() + SCHEDULE_RETRY_INTERVAL_MS;
			console.error(`Daily Note Plus: Scheduled creation failed`, error);
		}
		this.refreshScheduledCreation();
	}

	private runAutomaticCreation(): Promise<void> {
		if (!this.automaticCreationPromise) {
			const operation = this.performAutomaticCreation();
			this.automaticCreationPromise = operation.then(
				() => {
					this.automaticCreationPromise = null;
				},
				(error) => {
					this.automaticCreationPromise = null;
					throw error;
				},
			);
		}
		return this.automaticCreationPromise;
	}

	private async performAutomaticCreation(): Promise<void> {
		const dailyNotes = getAllDailyNotes(this.app);
		const today = moment();
		const yesterday = today.clone().subtract(1, `day`);
		const { last } = getFirstAndLastDates(dailyNotes);
		let missedDates: Moment[] = [];

		if (this.settings.autoCreateMissedDailies) {
			const startDate = last ? getNextDate(last) : today;
			if (startDate.isSameOrBefore(yesterday, `day`)) {
				missedDates = findMissingDates(dailyNotes, startDate, yesterday);
			}
		}

		// Today's note is independent from optional backfill confirmation.
		await this.createDailyNotes([today], false);

		if (missedDates.length <= 7) {
			await this.createDailyNotes(missedDates);
		} else {
			new DailyNoteCreatorModal(
				this.app,
				dailyNotes,
				last ?? yesterday,
				yesterday,
				dates => this.createDailyNotes(dates),
			).open();
		}
	}

	createDailyNotes(dates: Moment[], showNotice = true): Promise<number> {
		const operation = this.creationQueue.then(() => this.createDailyNotesNow(dates, showNotice));
		this.creationQueue = operation.then(
			() => undefined,
			() => undefined,
		);
		return operation;
	}

	private async createDailyNotesNow(dates: Moment[], showNotice: boolean): Promise<number> {
		const dailyNotes = getAllDailyNotes(this.app);
		const uniqueDates = new Map<string, Moment>();
		for (const date of dates) {
			uniqueDates.set(getDateUID(date), date.clone());
		}

		const sortedDates = Array.from(uniqueDates.values()).sort((left, right) => left.valueOf() - right.valueOf());
		let createdCount = 0;
		for (const date of sortedDates) {
			if (getDailyNote(date, dailyNotes)) {
				continue;
			}

			const createdFile = await createDailyNote(date);
			if (!createdFile) {
				throw new Error(`Unable to create daily note for ${date.format(DEFAULT_DAILY_NOTE_FORMAT)}`);
			}
			dailyNotes[getDateUID(date)] = createdFile;
			createdCount += 1;
		}

		if (showNotice && createdCount > 0) {
			new Notice(`Created ${createdCount} daily note` + (createdCount === 1 ? `` : `s`));
		}
		return createdCount;
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
					new DailyNoteCreatorModal(
						this.app,
						dailyNotes,
						first ?? today,
						today,
						dates => this.plugin.createDailyNotes(dates),
						() => this.display(),
					).open();
				})
			);

		// Create auto-create toggle
		new Setting(containerEl)
			.setName(`Create daily note on startup`)
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.autoCreateCurrentDaily)
				.onChange(async (value) => {
					this.plugin.settings.autoCreateCurrentDaily = value;
					await this.plugin.saveSettings();
					this.display();
				})
			);

		new Setting(containerEl)
			.setName(`Create daily note on schedule`)
			.setDesc(`Desktop only. Uses your computer's local time and catches up after sleep.`)
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.autoCreateDailyOnSchedule)
				.setDisabled(!Platform.isDesktopApp)
				.onChange(async (value) => {
					this.plugin.settings.autoCreateDailyOnSchedule = value;
					await this.plugin.saveSettings();
					this.plugin.refreshScheduledCreation();
					this.display();
				})
			);

		new Setting(containerEl)
			.setName(`Daily creation time`)
			.setDesc(`The local time used by scheduled creation on desktop.`)
			.addText(text => {
				text.inputEl.type = `time`;
				text.inputEl.step = `60`;
				text
					.setValue(this.plugin.settings.dailyCreationTime)
					.setDisabled(!Platform.isDesktopApp || !this.plugin.settings.autoCreateDailyOnSchedule)
					.onChange(async (value) => {
						if (!isValidDailyCreationTime(value)) {
							return;
						}
						this.plugin.settings.dailyCreationTime = value;
						await this.plugin.saveSettings();
						this.plugin.refreshScheduledCreation();
					});
			});

		// Create auto-backfill toggle
		const hasAutomaticTrigger = this.plugin.settings.autoCreateCurrentDaily
			|| (Platform.isDesktopApp && this.plugin.settings.autoCreateDailyOnSchedule);
		if (hasAutomaticTrigger) {
			new Setting(containerEl)
				.setName(`Auto-create missed daily notes`)
				.setDesc(`On startup or a scheduled run, create missing notes between the latest existing daily (` + (last ? last.format(dateFormat) : `never`) + `) and yesterday.`)
				.addToggle(toggle => toggle
					.setValue(this.plugin.settings.autoCreateMissedDailies)
					.onChange(async (value) => {
						this.plugin.settings.autoCreateMissedDailies = value;
						await this.plugin.saveSettings();
						this.display();
					})
				);
		}
	}
}
