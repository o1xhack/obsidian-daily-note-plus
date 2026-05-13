import test from 'node:test';
import * as assert from 'node:assert/strict';
import moment from 'moment';
import {
	countDatesInRange,
	getPresetDateRange,
	normalizeBackfillRange,
} from '../date-range';

test('last 7 days preset includes today and the previous 6 days', () => {
	const today = moment('2026-05-13', 'YYYY-MM-DD', true);
	const range = getPresetDateRange('last-7', today);

	assert.equal(range.start.format('YYYY-MM-DD'), '2026-05-07');
	assert.equal(range.end.format('YYYY-MM-DD'), '2026-05-13');
});

test('last 30 days preset includes today and the previous 29 days', () => {
	const today = moment('2026-05-13', 'YYYY-MM-DD', true);
	const range = getPresetDateRange('last-30', today);

	assert.equal(range.start.format('YYYY-MM-DD'), '2026-04-14');
	assert.equal(range.end.format('YYYY-MM-DD'), '2026-05-13');
});

test('this month preset starts on the first day and ends today', () => {
	const today = moment('2026-05-13', 'YYYY-MM-DD', true);
	const range = getPresetDateRange('this-month', today);

	assert.equal(range.start.format('YYYY-MM-DD'), '2026-05-01');
	assert.equal(range.end.format('YYYY-MM-DD'), '2026-05-13');
});

test('last month preset covers the full previous month', () => {
	const today = moment('2026-03-13', 'YYYY-MM-DD', true);
	const range = getPresetDateRange('last-month', today);

	assert.equal(range.start.format('YYYY-MM-DD'), '2026-02-01');
	assert.equal(range.end.format('YYYY-MM-DD'), '2026-02-28');
});

test('normalizes inclusive range day count', () => {
	const today = moment('2026-05-13', 'YYYY-MM-DD', true);
	const normalized = normalizeBackfillRange(
		moment('2026-05-07', 'YYYY-MM-DD', true),
		moment('2026-05-13', 'YYYY-MM-DD', true),
		today,
	);

	assert.equal(normalized.isValid, true);
	assert.equal(normalized.dayCount, 7);
	assert.equal(normalized.start?.format('YYYY-MM-DD'), '2026-05-07');
	assert.equal(normalized.end?.format('YYYY-MM-DD'), '2026-05-13');
});

test('invalid range returns zero days when start is after end', () => {
	const today = moment('2026-05-13', 'YYYY-MM-DD', true);
	const normalized = normalizeBackfillRange(
		moment('2026-05-14', 'YYYY-MM-DD', true),
		moment('2026-05-13', 'YYYY-MM-DD', true),
		today,
	);

	assert.equal(normalized.isValid, false);
	assert.equal(normalized.dayCount, 0);
	assert.equal(normalized.start, null);
	assert.equal(normalized.end, null);
});

test('future end date is clamped to today', () => {
	const today = moment('2026-05-13', 'YYYY-MM-DD', true);
	const normalized = normalizeBackfillRange(
		moment('2026-05-12', 'YYYY-MM-DD', true),
		moment('2026-05-20', 'YYYY-MM-DD', true),
		today,
	);

	assert.equal(normalized.isValid, true);
	assert.equal(normalized.futureClamped, true);
	assert.equal(normalized.dayCount, 2);
	assert.equal(normalized.end?.format('YYYY-MM-DD'), '2026-05-13');
});

test('range longer than max days is truncated', () => {
	const today = moment('2026-12-31', 'YYYY-MM-DD', true);
	const normalized = normalizeBackfillRange(
		moment('2026-01-01', 'YYYY-MM-DD', true),
		moment('2026-12-31', 'YYYY-MM-DD', true),
		today,
		30,
	);

	assert.equal(normalized.isValid, true);
	assert.equal(normalized.truncated, true);
	assert.equal(normalized.dayCount, 30);
	assert.equal(normalized.end?.format('YYYY-MM-DD'), '2026-01-30');
});

test('counts existing daily notes over an inclusive range', () => {
	const existingDates = new Set(['2025-12-28', '2026-01-01']);
	const count = countDatesInRange(
		moment('2025-12-28', 'YYYY-MM-DD', true),
		moment('2026-01-03', 'YYYY-MM-DD', true),
		date => existingDates.has(date.format('YYYY-MM-DD')),
	);

	assert.equal(count, 2);
});
