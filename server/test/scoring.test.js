import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeLeadScore } from '../src/scoring.js';

const base = {
  source: '', campaign: '', email: '', city: '', pin: '',
  disposition: '', reTriggered: false, attempts: 0, stage: 1, testRide: null, sale: null,
};

test('score is always clamped to 0-100', () => {
  const s = computeLeadScore({ ...base, source: 'Referral', campaign: 'Diwali Sale', email: 'a@b.com', city: 'Pune', pin: '411001', sale: {} });
  assert.ok(s >= 0 && s <= 100, `score ${s} out of range`);
});

test('source weighting: Referral outranks CSV Import, all else equal', () => {
  const referral = computeLeadScore({ ...base, source: 'Referral' });
  const csv = computeLeadScore({ ...base, source: 'CSV Import' });
  assert.ok(referral > csv, `Referral (${referral}) should outscore CSV Import (${csv})`);
});

test('campaign weighting: a real campaign outscores a blank one', () => {
  const withCampaign = computeLeadScore({ ...base, source: 'Website', campaign: 'Monsoon Offer' });
  const noCampaign = computeLeadScore({ ...base, source: 'Website', campaign: '' });
  assert.ok(withCampaign > noCampaign);
});

test('a completed sale is the maximum engagement signal', () => {
  const sold = computeLeadScore({ ...base, source: 'Website', sale: { auditStatus: 'pending' } });
  const testRideOnly = computeLeadScore({ ...base, source: 'Website', testRide: {} });
  assert.ok(sold > testRideOnly, 'a sale should score higher than just a test ride');
});

test('a repeat submission (reTriggered) scores higher than a first-time identical lead', () => {
  const repeat = computeLeadScore({ ...base, source: 'Website', reTriggered: true });
  const first = computeLeadScore({ ...base, source: 'Website', reTriggered: false });
  assert.ok(repeat > first);
});

test('an unknown/missing source does not crash and gets the default weight', () => {
  assert.doesNotThrow(() => computeLeadScore({ ...base, source: undefined }));
  assert.doesNotThrow(() => computeLeadScore({ ...base, source: 'Some Brand New Channel Nobody Configured' }));
});
