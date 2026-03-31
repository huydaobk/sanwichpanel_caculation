import { readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { run } from 'node:test';
import { spec } from 'node:test/reporters';
import { fileURLToPath } from 'node:url';

const regressionDir = new URL('./', import.meta.url);
const regressionDirPath = fileURLToPath(regressionDir);

const entries = await readdir(regressionDirPath, { withFileTypes: true });
const files = entries
  .filter((entry) => entry.isFile() && entry.name.endsWith('.test.mjs'))
  .map((entry) => path.join(regressionDirPath, entry.name))
  .sort();

if (files.length === 0) {
  console.error('No regression test files found in tests/regression');
  process.exit(1);
}

const stream = run({
  files,
  concurrency: true,
});

stream.compose(spec).pipe(process.stdout);

const exitCode = await new Promise((resolve, reject) => {
  stream.on('test:fail', () => {
    process.exitCode = 1;
  });
  stream.on('end', () => resolve(process.exitCode ?? 0));
  stream.on('error', reject);
});

process.exit(exitCode);
