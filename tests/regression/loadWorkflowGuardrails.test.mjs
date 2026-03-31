import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveCeilingDistributedLoads } from '../../src/calc/loads.js';

const baseConfig = {
  panelType: 'ceiling',
  spans: [3, 3],
  coreDensity: 40,
  coreThickness: 100,
  skinOut: 0.45,
  skinIn: 0.45,
  deadLoadMode: 'manual',
  deadLoadManual_kPa: 0.15,
  liveLoad_kPa: 0.25,
};

test('per-span mode preserves explicit zeros/blanks as zero-like values for UI guardrail handling while solver inputs stay numeric', () => {
  const distributed = resolveCeilingDistributedLoads({
    ...baseConfig,
    enableSpanDistributedLoads: true,
    deadLoadBySpan_kPa: ['', 0.45],
    liveLoadBySpan_kPa: [0.2, ''],
  });

  assert.equal(distributed.enabled, true);
  assert.deepEqual(distributed.deadBySpan, [0, 0.45]);
  assert.deepEqual(distributed.liveBySpan, [0.2, 0]);
});

test('uniform ceiling mode still ignores per-span arrays and falls back to scalar shared loads', () => {
  const distributed = resolveCeilingDistributedLoads({
    ...baseConfig,
    enableSpanDistributedLoads: false,
    deadLoadBySpan_kPa: [5, 8],
    liveLoadBySpan_kPa: [9, 12],
  });

  assert.equal(distributed.enabled, false);
  assert.deepEqual(distributed.deadBySpan.map((v) => Number(v.toFixed(3))), [0.15, 0.15]);
  assert.deepEqual(distributed.liveBySpan.map((v) => Number(v.toFixed(3))), [0.25, 0.25]);
});
