import test from 'node:test';
import * as assert from 'node:assert/strict';
import {
	DEFAULT_DAILY_CREATION_TIME,
	getNextDailyCreationDate,
	getLocalDateKey,
	hasReachedDailyCreationTime,
	isValidDailyCreationTime,
	normalizeDailyCreationTime,
	shouldRunScheduledCreation,
} from '../daily-schedule';

test('accepts only zero-padded 24-hour creation times', () => {
	assert.equal(isValidDailyCreationTime('00:00'), true);
	assert.equal(isValidDailyCreationTime('01:30'), true);
	assert.equal(isValidDailyCreationTime('23:59'), true);
	assert.equal(isValidDailyCreationTime('24:00'), false);
	assert.equal(isValidDailyCreationTime('1:30'), false);
	assert.equal(isValidDailyCreationTime('12:60'), false);
});

test('normalizes missing or invalid saved creation times to midnight', () => {
	assert.equal(normalizeDailyCreationTime(undefined), DEFAULT_DAILY_CREATION_TIME);
	assert.equal(normalizeDailyCreationTime('invalid'), DEFAULT_DAILY_CREATION_TIME);
	assert.equal(normalizeDailyCreationTime('01:00'), '01:00');
});

test('scheduled creation becomes due at the configured local time', () => {
	assert.equal(hasReachedDailyCreationTime(new Date(2026, 6, 15, 0, 59), '01:00'), false);
	assert.equal(hasReachedDailyCreationTime(new Date(2026, 6, 15, 1, 0), '01:00'), true);
	assert.equal(hasReachedDailyCreationTime(new Date(2026, 6, 15, 18, 30), '01:00'), true);
});

test('local date key uses local calendar fields', () => {
	assert.equal(getLocalDateKey(new Date(2026, 0, 2, 23, 59)), '2026-01-02');
});

test('scheduled creation runs at most once for each local date', () => {
	const now = new Date(2026, 6, 15, 1, 30);
	assert.equal(shouldRunScheduledCreation(now, '01:00', null), true);
	assert.equal(shouldRunScheduledCreation(now, '01:00', '2026-07-15'), false);
	assert.equal(shouldRunScheduledCreation(new Date(2026, 6, 16, 1, 30), '01:00', '2026-07-15'), true);
});

test('next creation date uses one future local-time timeout', () => {
	const beforeCreationTime = new Date(2026, 6, 15, 0, 30);
	const laterToday = getNextDailyCreationDate(beforeCreationTime, '01:00', null);
	assert.equal(laterToday?.getFullYear(), 2026);
	assert.equal(laterToday?.getMonth(), 6);
	assert.equal(laterToday?.getDate(), 15);
	assert.equal(laterToday?.getHours(), 1);
	assert.equal(laterToday?.getMinutes(), 0);

	const afterCreationTime = new Date(2026, 6, 15, 2, 0);
	const tomorrow = getNextDailyCreationDate(afterCreationTime, '01:00', '2026-07-15');
	assert.equal(tomorrow?.getDate(), 16);
	assert.equal(tomorrow?.getHours(), 1);
	assert.equal(tomorrow?.getMinutes(), 0);
});
