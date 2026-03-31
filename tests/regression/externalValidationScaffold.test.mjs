import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const fixturePath = path.resolve('tests/fixtures/external-validation-cases.json');

function loadFixture() {
  return JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
}

test('external validation scaffold fixture exists and has usable structure for next phase', () => {
  const fixture = loadFixture();

  assert.equal(typeof fixture.meta, 'object');
  assert.equal(Array.isArray(fixture.cases), true);
  assert.ok(fixture.cases.length >= 6 && fixture.cases.length <= 12, 'fixture should define a practical matrix of 6-12 representative cases');

  for (const item of fixture.cases) {
    assert.equal(typeof item.id, 'string');
    assert.equal(typeof item.title, 'string');
    assert.ok(['captured', 'partial', 'scaffold'].includes(item.status), `unexpected status for ${item.id}`);
    assert.ok(
      item.benchmarkClass === undefined || ['external-captured', 'internal-captured', 'scaffold'].includes(item.benchmarkClass),
      `unexpected benchmarkClass for ${item.id}`,
    );
    assert.equal(typeof item.goal, 'string');
    assert.equal(typeof item.referenceType, 'string');
    assert.equal(typeof item.referenceSource, 'object');
    assert.ok(Array.isArray(item.outputs) && item.outputs.length > 0, `${item.id} must define outputs to compare`);
    assert.equal(typeof item.tolerance, 'object');
  }
});

test('external validation scaffold does not pretend scaffold cases already have benchmark numbers', () => {
  const fixture = loadFixture();

  const scaffoldCases = fixture.cases.filter((item) => item.status === 'scaffold');
  assert.ok(scaffoldCases.length > 0, 'at least one scaffold case should remain for future external-source capture');

  for (const item of scaffoldCases) {
    assert.equal(Object.prototype.hasOwnProperty.call(item, 'expected'), false, `${item.id} should not carry fake expected benchmark values yet`);
    assert.equal(Object.prototype.hasOwnProperty.call(item, 'actual'), false, `${item.id} should not carry fake actual benchmark values yet`);
  }
});
