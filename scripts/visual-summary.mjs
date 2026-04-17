import { appendFileSync, existsSync, readFileSync } from "node:fs";

const RESULTS_FILE = "visual-results.json";

if (!existsSync(RESULTS_FILE)) {
  console.error(`${RESULTS_FILE} not found — skipping summary`);
  process.exit(0);
}

const data = JSON.parse(readFileSync(RESULTS_FILE, "utf8"));

function collectSteps(suites) {
  const steps = [];
  for (const suite of suites) {
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests) {
        for (const result of test.results) {
          for (const step of result.steps) {
            steps.push({ id: step.title, failed: step.error != null });
          }
        }
      }
    }
    steps.push(...collectSteps(suite.suites ?? []));
  }
  return steps;
}

const stories = collectSteps(data.suites);
const failed = stories.filter((s) => s.failed);
const passed = stories.filter((s) => !s.failed);

const lines = [
  "## Visual Snapshot Results",
  "",
  `${failed.length === 0 ? "✅" : "❌"} **${passed.length} passed** | **${failed.length} failed** out of ${stories.length} stories`,
];

if (failed.length > 0) {
  lines.push("", "### Failed Stories", "");
  for (const s of failed) {
    lines.push(`- \`${s.id}\``);
  }
}

const summary = lines.join("\n") + "\n";
process.stdout.write(summary);

if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
}
