import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { test } from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");
const skillPath = "skills/holoscope/";
const skill = read(`${skillPath}SKILL.md`);
const references = readdirSync(new URL(`${skillPath}references/`, root))
  .filter((name) => name.endsWith(".md"));
const allowedAccess = new Set([
  "CODEBASE", "HOLOSCOPE_PROJECT_INTERFACE", "HOLOSCOPE_PROJECT_SCRIPT", "GITHUB",
]);

// These are structural/content guards, not proof of agent behavior or API support.
test("published skills contain no evaluation fixtures or test files", () => {
  const checkDirectory = (path) => {
    for (const entry of readdirSync(new URL(path, root), { withFileTypes: true })) {
      assert.doesNotMatch(entry.name, /^(?:evals?|tests?|__tests__|fixtures?)$|(?:^|[.-])(?:test|spec)(?:[.-]|$)/i);
      if (entry.isDirectory()) checkDirectory(`${path}${entry.name}/`);
    }
  };
  checkDirectory("skills/");
});

test("every reference is routed exactly once and no route is dangling", () => {
  const routes = [...skill.matchAll(/references\/([\w-]+\.md)/g)].map((m) => m[1]);
  assert.deepEqual([...routes].sort(), [...references].sort());
});

for (const name of references) {
  test(`${name}: bounded size, frontmatter and declared access`, () => {
    const content = read(`${skillPath}references/${name}`);
    assert.ok(content.trimEnd().split("\n").length <= 100);
    const frontmatter = content.match(/^---\n([\s\S]+?)\n---\n/);
    assert.ok(frontmatter, "missing frontmatter");
    assert.match(frontmatter[1], /^name: [a-z0-9-]+$/m);
    assert.match(frontmatter[1], /^description: .+$/m);
    const access = frontmatter[1].match(/metadata:\n  required_access:\n((?:    - \w+\n?)+)/);
    assert.ok(access, "missing required_access");
    const values = [...access[1].matchAll(/- (\w+)/g)].map((m) => m[1]);
    assert.ok(values.length > 0 && values.every((value) => allowedAccess.has(value)));
  });
}

test("plugin manifests parse with valid versions and Claude/Cursor lockstep", () => {
  const manifests = [".claude-plugin", ".cursor-plugin", ".codex-plugin"]
    .map((dir) => JSON.parse(read(`${dir}/plugin.json`)));
  for (const manifest of manifests) {
    assert.equal(manifest.name, "holoscope");
    assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
  }
  assert.equal(manifests[0].version, manifests[1].version);
});

test("top-level contract keeps read-only automatic permissions and new workflow", () => {
  assert.match(skill, /^name: holoscope$/m);
  assert.match(skill, /hosted custom `llm_as_judge` evaluators/);
  assert.match(skill, /does not support hosted `code` evaluators/);
  assert.match(skill, /Run deterministic checks locally.*Scores API/);
  assert.doesNotMatch(skill, /Supports `llm_as_judge` and `code`/);
  assert.doesNotMatch(skill, /latest HoloScope|older deployments|Older v3-write-mode/);
  assert.match(skill, /GET success does not prove POST\/PATCH permission/);
  const automatic = skill.match(/^---\n([\s\S]+?)\n---\n/)[1];
  assert.doesNotMatch(automatic, /Bash\([^\n]*(?:create|delete|update|upload|run-experiment)/i);
  assert.ok(references.includes("run-experiments.md"));
});

test("workflow guards preserve the highest-risk product constraints", () => {
  const evals = read(`${skillPath}references/setting-up-evals.md`);
  assert.match(evals, /automatically moves its existing rules/);
  assert.match(evals, /serviceNames/);
  assert.match(evals, /Do not create `type=code`/);
  assert.match(evals, /generic Langfuse schema.*does not establish HoloScope support/);
  assert.match(evals, /run the deterministic evaluator locally.*Scores API/);
  assert.doesNotMatch(evals, /preflight may execute code|Code creation validates shape/);
  const dataset = read(`${skillPath}references/create-dataset.md`);
  assert.match(dataset, /never quietly convert actual output to expected output/);
  assert.match(dataset, /Freeze the item ID list/);
  const experiments = read(`${skillPath}references/run-experiments.md`);
  assert.match(experiments, /distinct run name per candidate × repetition/);
  assert.match(experiments, /retry only the missing step/);
  assert.match(experiments, /one scoring owner per metric/);
});

test("platform workflows do not require source access or SDK execution by default", () => {
  for (const name of ["create-dataset", "run-experiments", "setting-up-evals"]) {
    const content = read(`${skillPath}references/${name}.md`);
    const frontmatter = content.match(/^---\n([\s\S]+?)\n---\n/)[1];
    assert.match(frontmatter, /- HOLOSCOPE_PROJECT_INTERFACE/);
    assert.doesNotMatch(frontmatter, /- CODEBASE|- HOLOSCOPE_PROJECT_SCRIPT/);
  }
  assert.match(skill, /`CODEBASE` means access to the user's own application\/Agent source code/);
  assert.match(skill, /Never require HoloScope platform source code/);
  assert.match(skill, /`HOLOSCOPE_PROJECT_SCRIPT` only when executing SDK code/);
  assert.match(skill, /existing callable Agent.*without source access/);
  for (const name of ["sdk-upgrade", "prompt-engineering"]) {
    const content = read(`${skillPath}references/${name}.md`);
    const frontmatter = content.match(/^---\n([\s\S]+?)\n---\n/)[1];
    assert.match(frontmatter, /- CODEBASE/);
  }
});

test("workflows with explicit API readback declare project interface access", () => {
  for (const name of ["instrumentation", "user-feedback"]) {
    const content = read(`${skillPath}references/${name}.md`);
    const frontmatter = content.match(/^---\n([\s\S]+?)\n---\n/)[1];
    assert.match(frontmatter, /- HOLOSCOPE_PROJECT_INTERFACE/);
  }
});

test("dataset safeguards separate reviewed labels and prevent source lookup leakage", () => {
  const dataset = read(`${skillPath}references/create-dataset.md`);
  assert.match(dataset, /review-only/);
  assert.match(dataset, /non-empty `expected_output`/);
  assert.match(dataset, /evidence gaps/);
  assert.match(dataset, /static inspection.*reported observation.*independent measurement/);
});

test("experiment acceptance checks service attribution, score coverage and timeout recovery", () => {
  const experiments = read(`${skillPath}references/run-experiments.md`);
  assert.match(experiments, /Trace-level `serviceName`/);
  assert.match(experiments, /unknown_service/);
  assert.match(experiments, /LANGFUSE_FETCH_LLM_COMPLETION_TIMEOUT_MS/);
  assert.match(experiments, /jobOutputScoreId/);
  assert.match(experiments, /`PENDING`.*active/);
  assert.match(experiments, /tenant prefix.*\.json/);
  assert.match(experiments, /expected coverage per metric/);
  const instrumentation = read(`${skillPath}references/instrumentation.md`);
  assert.match(instrumentation, /Service name.*service\.name/);
});

test("scores retain explanations, identity and explicit quality interpretation", () => {
  const evals = read(`${skillPath}references/setting-up-evals.md`);
  assert.match(evals, /`comment`.*`metadata`/);
  assert.match(evals, /resultInterpretation/);
  assert.match(evals, /score ID is not an evaluator ID/);
  assert.match(evals, /original.*`id`.*`name`.*`timestamp`/);
  assert.match(evals, /frozen_reconstruction/);
  assert.match(evals, /do not need a new scoring implementation/);
  assert.match(skill, /standalone comments.*score `comment`/);
});
