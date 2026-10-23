import test from 'node:test';
import assert from 'node:assert/strict';
import { isValidSocialRange, socialPresetRange, shiftSocialDate, socialTodayMaceio, tiktokPublicationDay } from './socialAnalyticsPeriod.ts';

test('presets show 7, 30, 90 full calendar days', () => {
  for (const days of [7, 30, 90]) {
    const range = socialPresetRange(days, 0, '2026-10-23');
    assert.equal(range.endDate, '2026-10-23');
    assert.equal(range.startDate, shiftSocialDate('2026-10-23', 1 - days));
  }
  assert.deepEqual(socialPresetRange(30, 3, '2026-10-23'), { startDate: '2026-09-21', endDate: '2026-10-20' });
});

test('custom dates reject invalid ranges, future dates and more than 366 days', () => {
  assert.equal(isValidSocialRange('2026-10-01', '2026-10-23', '2026-10-23'), true);
  assert.equal(isValidSocialRange('2026-10-23', '2026-10-01', '2026-10-23'), false);
  assert.equal(isValidSocialRange('2026-02-30', '2026-03-01', '2026-10-23'), false);
  assert.equal(isValidSocialRange('2026-10-01', '2026-10-24', '2026-10-23'), false);
  assert.equal(isValidSocialRange('2025-01-01', '2026-10-23', '2026-10-23'), false);
});

test('Maceio day boundaries are consistent with published TikTok videos', () => {
  assert.equal(socialTodayMaceio(new Date('2026-10-24T02:30:00Z')), '2026-10-23');
  assert.equal(tiktokPublicationDay(Date.parse('2026-10-24T02:30:00Z') / 1000), '2026-10-23');
  assert.equal(tiktokPublicationDay(Date.parse('2026-10-24T03:00:00Z') / 1000), '2026-10-24');
});
