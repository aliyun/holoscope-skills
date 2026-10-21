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
  assert.match(skill, /hosted custom `llm_as_judge` and `code` evaluators/);
  assert.doesNotMatch(skill, /does not support hosted `code`|hosted `llm_as_judge` only/);
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
  assert.match(evals, /`type=code`.*`sourceCode`.*`sourceCodeLanguage`/);
  assert.match(evals, /`PYTHON`.*`TYPESCRIPT`/);
  assert.match(evals, /Code creation checks the request and configured dispatcher\/language support without executing the source/);
  assert.match(evals, /When creating Code rules.*`evaluator.type=code`.*omit `mapping`/);
  assert.match(evals, /PATCH requests.*`evaluator`.*only `name` and `scope`/);
  assert.match(evals, /Do not switch an existing rule between LLM and Code engines through PATCH/);
  assert.doesNotMatch(evals, /Do not create `type=code`|not hosted `code` evaluators/);
  const dataset = read(`${skillPath}references/create-dataset.md`);
  assert.match(dataset, /never quietly convert actual output to expected output/);
  assert.match(dataset, /Freeze the item ID list/);
  const experiments = read(`${skillPath}references/run-experiments.md`);
  assert.match(experiments, /distinct run name per candidate × repetition/);
  assert.match(experiments, /retry only the missing step/);
  assert.match(experiments, /one scoring owner per metric/);
});

test("health distinguishes the backend handler from the public Agent gateway", () => {
  const health = skill.split("\n").find((line) => line.includes("/api/public/health"));
  assert.ok(health, "missing health endpoint");
  assert.match(health, /backend.*unauthenticated/);
  assert.match(skill, /Agent gateway.*Basic.*IP/);
  assert.match(read(`${skillPath}references/cli.md`), /gateway.*Basic.*IP/i);
});

test("API index contains exactly the 39 retained public Agent operations", () => {
  const index = skill.split("## Supported API Surface\n")[1]
    .split("## Use case specific references\n")[0];
  assert.match(index, /\[.*\]\(https:\/\/help\.aliyun\.com\/zh\/hologres\/user-guide\/holoscope-service-api-list\)/);
  const actual = [...index.matchAll(/^\| ([^|]+) \| `([^`]+)` \|/gm)]
    .flatMap((row) => [...row[1].matchAll(/`(GET|POST|PATCH|DELETE)`/g)]
      .map((method) => `${method[1]} ${row[2]}`));
  const expected = {
    GET: [
      "traces", "traces/{traceId}", "observations", "observations/{observationId}",
      "sessions", "sessions/{sessionId}", "v3/scores", "v2/scores",
      "v2/datasets", "v2/datasets/{datasetName}", "dataset-items", "dataset-items/{id}",
      "dataset-run-items", "datasets/{datasetName}/runs", "datasets/{datasetName}/runs/{runName}",
      "projects", "health", "unstable/evaluators",
      "unstable/evaluators/{evaluatorId}", "unstable/evaluation-rules",
      "unstable/evaluation-rules/{evaluationRuleId}",
    ],
    POST: [
      "otel/v1/traces", "otel/v1/metrics", "ingestion", "scores", "v2/datasets",
      "dataset-items", "dataset-run-items", "media", "unstable/evaluators", "unstable/evaluation-rules",
    ],
    PATCH: ["media/{mediaId}", "unstable/evaluation-rules/{evaluationRuleId}"],
    DELETE: [
      "traces", "traces/{traceId}", "dataset-items/{id}", "datasets/{datasetName}/runs/{runName}",
      "unstable/evaluators/{evaluatorId}", "unstable/evaluation-rules/{evaluationRuleId}",
    ],
  };
  assert.equal(new Set(actual).size, actual.length, "duplicate public operation");
  assert.deepEqual(actual.sort(), Object.entries(expected)
    .flatMap(([method, paths]) => paths.map((path) => `${method} /api/public/${path}`)).sort());
});

test("published workflows expose public Agent APIs without Console transports", () => {
  assert.match(skill, /public Agent endpoint and project API keys/);
  const documents = [skill, read("README.md"), ...references.map((name) => read(`${skillPath}references/${name}`))];
  for (const content of documents) {
    assert.doesNotMatch(content, /`\/v1\/|(?:GET|POST|PATCH|PUT|DELETE) \/v1\//);
    assert.doesNotMatch(content, /\/api\/trpc\/|evaluatorCalibration|SuperJSON|evalJob:(?:read|CUD)/);
    assert.doesNotMatch(content, /authorized Console (?:client|HTTP)|native Web session adapter/);
  }
});

test("public guidance states server and network conditions rather than promising universal availability", () => {
  assert.match(skill, /Trace\/Observation\/Session v1 and Score v2 GETs.*`events_only`/);
  assert.match(skill, /Code.*dispatcher.*language/);
  const cli = read(`${skillPath}references/cli.md`);
  assert.match(cli, /signed storage host.*reachable/);
  assert.match(cli, /`Content-Type`.*`Content-Length`.*returned `uploadHeaders`/);
  assert.match(cli, /same.*snapshot.*discovery.*execution/);
});

test("Score v3 guidance uses the documented extra field groups", () => {
  const allowedFields = new Set(["details", "subject", "annotation"]);
  const cli = read(`${skillPath}references/cli.md`);
  assert.match(cli, /documented.*`details`.*`subject`.*`annotation`/);
  assert.doesNotMatch(cli, /schema accepts `core`/);
  const documents = ["SKILL.md", ...references.map((name) => `references/${name}`)];
  let examples = 0;
  for (const name of documents) {
    for (const line of read(`${skillPath}${name}`).split("\n")) {
      if (!line.includes("/api/public/v3/scores")) continue;
      for (const match of line.matchAll(/fields=([a-z,]+)/g)) {
        examples += 1;
        for (const field of match[1].split(",")) {
          assert.ok(allowedFields.has(field), `${name}: unsupported Score v3 field group ${field}`);
        }
      }
    }
  }
  assert.ok(examples > 0, "no Score v3 field examples checked");
});

test("media guidance retains deployment checks without internal source revisions", () => {
  const cli = read(`${skillPath}references/cli.md`);
  const patch = cli.split("\n").find((line) => line.startsWith("- Media PATCH compatibility:"));
  assert.ok(patch, "missing media PATCH compatibility guidance");
  assert.match(patch, /official.*`uploadedAt`.*`uploadHttpStatus`.*optional/);
  assert.match(patch, /actual.*both.*target.*validation error/);
  assert.match(cli, /hex.*44-character Base64.*target/);
  for (const content of [skill, ...references.map((name) => read(`${skillPath}references/${name}`))]) {
    assert.doesNotMatch(content, /source snapshot|(?:commit|revision|snapshot)\s+`[a-f0-9]{7,40}`/i);
  }
});

test("Session evaluation records bounded deployment verification and its public contract", () => {
  assert.ok(references.includes("session-evaluation.md"));
  const session = read(`${skillPath}references/session-evaluation.md`);
  assert.match(session, /check support on the target deployment/);
  assert.match(session, /public or deployment-provided.*contract/);
  assert.match(session, /explicit authorization.*model-call budget/);
  assert.match(session, /"target":"session".*"enabled":false/);
  assert.match(session, /"mapping":.*"source":"conversation"/);
  assert.match(session, /1.*86400.*default 300/);
  assert.match(session, /Only after.*creation.*activation.*score readback.*reevaluation.*verified for that deployment/);
  assert.match(skill, /Session evaluation.*verified on one.*pre-release deployment/);
  assert.match(read("README.md"), /deployment-specific automatic Session evaluation/);
  assert.match(read(`${skillPath}references/cli.md`), /verified.*Session.*contract.*authorization/);
  const evals = read(`${skillPath}references/setting-up-evals.md`);
  assert.match(evals, /Session.*deployment-specific.*LLM-only/);
  assert.doesNotMatch(session, /GET \/v1\/|PUT \/v1\/|evals\.session/);
});

test("Session verification checks score replacement and execution identity", () => {
  const session = read(`${skillPath}references/session-evaluation.md`);
  assert.match(session, /disabled rule.*read back/);
  assert.match(session, /second approved turn.*reevaluation/);
  assert.match(session, /GET \/api\/public\/v3\/scores\?sessionId=/);
  for (const field of ["session_eval_rule_id", "session_eval_input_version", "session_eval_execution_id"]) assert.ok(session.includes(field));
  assert.match(session, /same-rule.*replaced.*pre-release/);
  assert.doesNotMatch(session, /reset the checkpoint|preserves its checkpoint|Each version is attempted once/);
});

test("Code sample preflight depends on enabled state and deployment support", () => {
  const evals = read(`${skillPath}references/setting-up-evals.md`);
  assert.match(evals, /disabled rule association only saves configuration/);
  assert.match(evals, /enabled rule creation or update enters preflight validation/);
  assert.match(evals, /sample execution depends on the deployment preview flag and available matching samples/);
  assert.doesNotMatch(evals, /do not equate "disabled rule" with "no execution or cost"/);
});

test("platform workflows do not require source access or SDK execution by default", () => {
  for (const name of ["create-dataset", "run-experiments", "setting-up-evals",
    "session-evaluation"]) {
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

test("experiment acceptance uses public diagnostics without internal recovery", () => {
  const experiments = read(`${skillPath}references/run-experiments.md`);
  assert.match(experiments, /Trace-level `serviceName`/);
  assert.match(experiments, /unknown_service/);
  assert.match(experiments, /GET \/api\/public\/unstable\/evaluation-rules\/\{evaluationRuleId\}/);
  assert.match(experiments, /GET \/api\/public\/v3\/scores/);
  assert.match(experiments, /missing scores alone do not establish a worker failure/);
  assert.match(experiments, /Console UI or contact support/);
  assert.doesNotMatch(experiments, /LANGFUSE_FETCH_LLM_COMPLETION_TIMEOUT_MS|jobOutputScoreId|`PENDING`|queue\/database intervention|tenant prefix/);
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
  assert.match(skill, /score `comment`.*human-readable evaluation reason/);
});
