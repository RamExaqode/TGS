'use strict';

/**
 * Writes a results table into the GitHub Actions run summary.
 *
 * Reads the JSON reporter output that playwright.config.ts produces on CI.
 * Runs with `if: always()`, so it has to cope with the suite having failed
 * before any results were written — an unset TSR_BASE_URL stops the run in
 * seconds, and a crash here would bury that real error under a second one.
 */

const fs = require('fs');

const RESULTS = 'test-results/results.json';
const summaryFile = process.env.GITHUB_STEP_SUMMARY;

function write(text) {
  if (summaryFile) {
    fs.appendFileSync(summaryFile, `${text}\n`);
  } else {
    console.log(text);
  }
}

if (!fs.existsSync(RESULTS)) {
  write('## Playwright results\n');
  write(
    'No results file was produced — the run stopped before any test executed. ' +
      'Check the **Run Tests** step; a missing repository secret fails this early.'
  );
  process.exit(0);
}

let report;

try {
  report = JSON.parse(fs.readFileSync(RESULTS, 'utf8'));
} catch (error) {
  write('## Playwright results\n');
  write(`Could not parse ${RESULTS}: ${error.message}`);
  process.exit(0);
}

/** The JSON reporter nests suites, so flatten to a list of specs. */
function collect(suites, out = []) {
  for (const suite of suites ?? []) {
    for (const spec of suite.specs ?? []) {
      const result = spec.tests?.[0]?.results?.[0];

      out.push({
        title: spec.title,
        file: suite.file ?? '',
        status: spec.tests?.[0]?.status ?? 'unknown',
        ms: result?.duration ?? 0,
        retries: (spec.tests?.[0]?.results?.length ?? 1) - 1,
      });
    }

    collect(suite.suites, out);
  }

  return out;
}

const specs = collect(report.suites);

/**
 * Icon plus the word. Two statuses that differ only by a small glyph are easy
 * to misread — a skipped test looked like a passing one in an early run.
 */
const STATUS = {
  expected: '✅ Passed',
  passed: '✅ Passed',
  skipped: '⏭️ Skipped',
  flaky: '⚠️ Flaky',
  unexpected: '❌ Failed',
  failed: '❌ Failed',
};

const counts = specs.reduce((acc, spec) => {
  acc[spec.status] = (acc[spec.status] ?? 0) + 1;
  return acc;
}, {});

const seconds = ((report.stats?.duration ?? 0) / 1000).toFixed(1);

write('## Playwright results\n');
write(
  `**${counts.expected ?? 0} passed** · ` +
    `${counts.unexpected ?? 0} failed · ` +
    `${counts.flaky ?? 0} flaky · ` +
    `${counts.skipped ?? 0} skipped — in ${seconds}s\n`
);

write('| Status | Test | File | Time |');
write('|---|---|---|---|');

/* Failures first: on a red run they are the only rows anyone reads. */
const order = { unexpected: 0, flaky: 1, expected: 2, skipped: 3 };

specs
  .sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9))
  .forEach((spec) => {
    const retried = spec.retries > 0 ? ` _(${spec.retries} retry)_` : '';

    /* A duration for something that never started is noise, not data. */
    const time =
      spec.status === 'skipped' ? '–' : `${(spec.ms / 1000).toFixed(1)}s`;

    write(
      `| ${STATUS[spec.status] ?? '❔ Unknown'} | ${spec.title}${retried} | \`${spec.file}\` | ${time} |`
    );
  });

if ((counts.unexpected ?? 0) > 0) {
  write(
    '\nDownload the **Playwright Report** artifact for traces and screenshots.'
  );
}
