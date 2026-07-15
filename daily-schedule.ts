export const DEFAULT_DAILY_CREATION_TIME = `00:00`;

const DAILY_CREATION_TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidDailyCreationTime(value: string): boolean {
	return DAILY_CREATION_TIME_PATTERN.test(value);
}

export function normalizeDailyCreationTime(value: unknown): string {
	return typeof value === `string` && isValidDailyCreationTime(value)
		? value
		: DEFAULT_DAILY_CREATION_TIME;
}

export function hasReachedDailyCreationTime(now: Date, creationTime: string): boolean {
	if (!isValidDailyCreationTime(creationTime)) {
		return false;
	}

	const [hour, minute] = creationTime.split(`:`).map(Number);
	return now.getHours() > hour || (now.getHours() === hour && now.getMinutes() >= minute);
}

export function getLocalDateKey(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, `0`);
	const day = String(date.getDate()).padStart(2, `0`);
	return `${year}-${month}-${day}`;
}

export function shouldRunScheduledCreation(now: Date, creationTime: string, lastRunDate: string | null): boolean {
	return lastRunDate !== getLocalDateKey(now) && hasReachedDailyCreationTime(now, creationTime);
}

export function getNextDailyCreationDate(now: Date, creationTime: string, lastRunDate: string | null): Date | null {
	if (!isValidDailyCreationTime(creationTime)) {
		return null;
	}

	const [hour, minute] = creationTime.split(`:`).map(Number);
	const nextCreation = new Date(now);
	nextCreation.setHours(hour, minute, 0, 0);

	if (lastRunDate === getLocalDateKey(now) || nextCreation.getTime() <= now.getTime()) {
		nextCreation.setDate(nextCreation.getDate() + 1);
	}
	return nextCreation;
}
