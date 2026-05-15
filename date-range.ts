import type { moment } from 'obsidian';

export type Moment = ReturnType<typeof moment>;

export const MAX_BACKFILL_RANGE_DAYS = 3650;

export type DateRangePreset = `last-7` | `last-30` | `this-month` | `last-month`;

export interface DateRange {
	start: Moment;
	end: Moment;
}

export interface NormalizedDateRange {
	start: Moment | null;
	end: Moment | null;
	dayCount: number;
	isValid: boolean;
	truncated: boolean;
	futureClamped: boolean;
}

export function isValidDateInput(date: Moment): boolean {
	return date.isValid() && date.year().toString().length === 4;
}

export function getPresetDateRange(preset: DateRangePreset, today: Moment): DateRange {
	const normalizedToday = today.clone().startOf(`day`);

	switch (preset) {
		case `last-7`:
			return {
				start: normalizedToday.clone().subtract(6, `day`),
				end: normalizedToday,
			};
		case `last-30`:
			return {
				start: normalizedToday.clone().subtract(29, `day`),
				end: normalizedToday,
			};
		case `this-month`:
			return {
				start: normalizedToday.clone().startOf(`month`),
				end: normalizedToday,
			};
		case `last-month`: {
			const lastMonth = normalizedToday.clone().subtract(1, `month`);
			return {
				start: lastMonth.clone().startOf(`month`),
				end: lastMonth.clone().endOf(`month`).startOf(`day`),
			};
		}
	}
}

export function normalizeBackfillRange(
	start: Moment,
	end: Moment,
	today: Moment,
	maxDays = MAX_BACKFILL_RANGE_DAYS,
): NormalizedDateRange {
	if (!isValidDateInput(start) || !isValidDateInput(end)) {
		return {
			start: null,
			end: null,
			dayCount: 0,
			isValid: false,
			truncated: false,
			futureClamped: false,
		};
	}

	const normalizedStart = start.clone().startOf(`day`);
	const requestedEnd = end.clone().startOf(`day`);
	const normalizedToday = today.clone().startOf(`day`);
	const futureClamped = requestedEnd.isAfter(normalizedToday, `day`);
	const clampedEnd = futureClamped ? normalizedToday : requestedEnd;

	if (normalizedStart.isAfter(clampedEnd, `day`)) {
		return {
			start: null,
			end: null,
			dayCount: 0,
			isValid: false,
			truncated: false,
			futureClamped,
		};
	}

	const requestedDayCount = clampedEnd.diff(normalizedStart, `days`) + 1;
	const truncated = requestedDayCount > maxDays;
	const normalizedEnd = truncated ? normalizedStart.clone().add(maxDays - 1, `days`) : clampedEnd;

	return {
		start: normalizedStart,
		end: normalizedEnd,
		dayCount: truncated ? maxDays : requestedDayCount,
		isValid: true,
		truncated,
		futureClamped,
	};
}

export function countDatesInRange(
	start: Moment,
	end: Moment,
	matchesDate: (date: Moment) => boolean,
): number {
	let count = 0;
	const currentDate = start.clone();

	while (currentDate.isSameOrBefore(end, `day`)) {
		if (matchesDate(currentDate)) {
			count += 1;
		}
		currentDate.add(1, `day`);
	}

	return count;
}
